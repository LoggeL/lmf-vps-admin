import simpleGit from 'simple-git';
import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { createApp, createDeployment, updateDeployment, getApp } from '../db';
import { createDnsRecord } from './cloudflare';
import { notifyDeploySuccess, notifyDeployFailed } from './discord';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const PROJECTS_DIR = '/home/fedora/projects';
const STACKS_DIR = '/opt/stacks';
const SERVER_IP = '135.125.207.21';

interface DeployOptions {
  githubUrl: string;
  name: string;
  domain: string;
  port: number;
  envVars?: Record<string, string>;
  onProgress?: (msg: string) => void;
}

export type ProjectType = 'nodejs' | 'python' | 'static' | 'dockerfile';

export function detectProjectType(projectPath: string): ProjectType {
  if (fs.existsSync(path.join(projectPath, 'Dockerfile'))) {
    return 'dockerfile';
  }
  if (fs.existsSync(path.join(projectPath, 'package.json'))) {
    return 'nodejs';
  }
  if (fs.existsSync(path.join(projectPath, 'requirements.txt')) || 
      fs.existsSync(path.join(projectPath, 'pyproject.toml'))) {
    return 'python';
  }
  return 'static';
}

export function generateDockerfile(projectType: ProjectType, port: number): string {
  switch (projectType) {
    case 'nodejs':
      return `FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build || true
EXPOSE ${port}
CMD ["npm", "start"]
`;
    case 'python':
      return `FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt* pyproject.toml* ./
RUN pip install --no-cache-dir -r requirements.txt 2>/dev/null || pip install .
COPY . .
EXPOSE ${port}
CMD ["python", "app.py"]
`;
    case 'static':
      return `FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
`;
    default:
      return '';
  }
}

export function generateDockerCompose(name: string, port: number, envVars: Record<string, string> = {}): string {
  const envLines = Object.entries(envVars)
    .map(([k, v]) => `      - ${k}=${v}`)
    .join('\n');

  return `services:
  ${name}:
    build:
      context: ${PROJECTS_DIR}/${name}
      dockerfile: Dockerfile
    container_name: ${name}
    restart: unless-stopped
    networks:
      - proxy
    environment:
      - PORT=${port}
${envLines ? envLines : ''}
    labels:
      - "com.centurylinklabs.watchtower.enable=false"

networks:
  proxy:
    external: true
`;
}

export function generateNginxConfig(name: string, domain: string, port: number): string {
  return `# ------------------------------------------------------------
# ${domain}
# ------------------------------------------------------------

server {
  set $forward_scheme http;
  set $server         "${name}";
  set $port           ${port};

  listen 80;
  listen [::]:80;

  server_name ${domain};

  include conf.d/include/block-exploits.conf;

  access_log /data/logs/proxy-host-${name}_access.log proxy;
  error_log /data/logs/proxy-host-${name}_error.log warn;

  location /socket.io/ {
    proxy_pass http://${name}:${port}/socket.io/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 86400;
  }

  location / {
    proxy_pass http://${name}:${port};
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  include /data/nginx/custom/server_proxy[.]conf;
}
`;
}

export async function deployApp(options: DeployOptions): Promise<string> {
  const { githubUrl, name, domain, port, envVars = {}, onProgress } = options;
  
  // Security validation
  if (!/^[a-z0-9-]+$/.test(name)) {
    throw new Error('Invalid app name. Use only lowercase letters, numbers, and hyphens.');
  }
  if (!/^[a-zA-Z0-9.-]+$/.test(domain)) {
    throw new Error('Invalid domain format.');
  }
  if (!/^https:\/\/github\.com\/[\w-]+\/[\w-.]+$/.test(githubUrl)) {
    throw new Error('Invalid GitHub URL. Must be a valid public GitHub repository URL.');
  }

  const log = (msg: string) => {
    console.log(`[deploy:${name}] ${msg}`);
    onProgress?.(msg);
  };

  const appId = uuid();
  const projectPath = path.join(PROJECTS_DIR, name);
  const stackPath = path.join(STACKS_DIR, name);
  const webhookSecret = uuid();

  // Create app record first (so deployments foreign key works)
  createApp({
    id: appId,
    name,
    github_url: githubUrl,
    domain,
    container_name: name,
    stack_path: stackPath,
    port,
    env_vars: JSON.stringify(envVars),
    webhook_secret: webhookSecret
  });

  const deploymentId = createDeployment(appId, 'building');

  try {
    // Clone repo
    log(`Cloning ${githubUrl}...`);
    if (fs.existsSync(projectPath)) {
      fs.rmSync(projectPath, { recursive: true });
    }
    await simpleGit().clone(githubUrl, projectPath);

    // Detect project type
    const projectType = detectProjectType(projectPath);
    log(`Detected project type: ${projectType}`);

    // Generate Dockerfile if not present
    if (projectType !== 'dockerfile') {
      log('Generating Dockerfile...');
      const dockerfile = generateDockerfile(projectType, port);
      fs.writeFileSync(path.join(projectPath, 'Dockerfile'), dockerfile);
    }

    // Create stack directory
    fs.mkdirSync(stackPath, { recursive: true });

    // Generate docker-compose.yml
    log('Generating docker-compose.yml...');
    const compose = generateDockerCompose(name, port, envVars);
    fs.writeFileSync(path.join(stackPath, 'docker-compose.yml'), compose);

    // Build and start container
    log('Building Docker image...');
    await execAsync(`docker compose build`, { cwd: stackPath });

    log('Starting container...');
    await execAsync(`docker compose up -d`, { cwd: stackPath });

    // Create DNS record
    log(`Creating DNS record for ${domain}...`);
    try {
      await createDnsRecord(domain, SERVER_IP, 'A', true);
    } catch (err: any) {
      log(`DNS warning: ${err.message}`);
    }

    // Create nginx config
    log('Configuring reverse proxy...');
    const nginxConfig = generateNginxConfig(name, domain, port);
    const configFileName = `${name}.conf`;
    fs.writeFileSync(`/tmp/${configFileName}`, nginxConfig);
    await execAsync(`docker cp /tmp/${configFileName} nginx-proxy-app-1:/data/nginx/proxy_host/${configFileName}`);
    await execAsync(`docker exec nginx-proxy-app-1 nginx -t`);
    await execAsync(`docker exec nginx-proxy-app-1 nginx -s reload`);

    updateDeployment(deploymentId, 'success');
    log(`✅ Deployed successfully to https://${domain}`);

    await notifyDeploySuccess(name, domain);

    return appId;
  } catch (err: any) {
    updateDeployment(deploymentId, 'failed', err.message);
    log(`❌ Deployment failed: ${err.message}`);
    await notifyDeployFailed(name, err.message);
    throw err;
  }
}

export async function updateApp(appId: string, onProgress?: (msg: string) => void): Promise<void> {
  const app = getApp(appId) as any;
  if (!app) throw new Error('App not found');

  const log = (msg: string) => {
    console.log(`[update:${app.name}] ${msg}`);
    onProgress?.(msg);
  };

  const projectPath = path.join(PROJECTS_DIR, app.name);
  const stackPath = app.stack_path;

  const deploymentId = createDeployment(appId, 'building');

  try {
    // Git pull
    log('Pulling latest changes...');
    const git = simpleGit(projectPath);
    const pullResult = await git.pull();
    log(`Updated: ${pullResult.summary.changes} changes`);

    // Rebuild
    log('Rebuilding...');
    await execAsync(`docker compose build --no-cache`, { cwd: stackPath });

    log('Restarting...');
    await execAsync(`docker compose up -d`, { cwd: stackPath });

    updateDeployment(deploymentId, 'success');
    log('✅ Update complete');
  } catch (err: any) {
    updateDeployment(deploymentId, 'failed', err.message);
    throw err;
  }
}
