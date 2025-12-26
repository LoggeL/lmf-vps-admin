import Docker from 'dockerode';

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

export async function listContainers() {
  const containers = await docker.listContainers({ all: true });
  return containers.map(c => ({
    id: c.Id.substring(0, 12),
    name: c.Names[0]?.replace('/', '') || '',
    image: c.Image,
    state: c.State,
    status: c.Status,
    ports: c.Ports.map(p => p.PublicPort ? `${p.PublicPort}:${p.PrivatePort}` : `${p.PrivatePort}`).filter(Boolean)
  }));
}

export async function getContainer(nameOrId: string) {
  const container = docker.getContainer(nameOrId);
  const info = await container.inspect();
  return {
    id: info.Id.substring(0, 12),
    name: info.Name.replace('/', ''),
    image: info.Config.Image,
    state: info.State.Status,
    created: info.Created,
    ports: Object.keys(info.Config.ExposedPorts || {})
  };
}

export async function startContainer(nameOrId: string) {
  const container = docker.getContainer(nameOrId);
  await container.start();
}

export async function stopContainer(nameOrId: string) {
  const container = docker.getContainer(nameOrId);
  await container.stop();
}

export async function restartContainer(nameOrId: string) {
  const container = docker.getContainer(nameOrId);
  await container.restart();
}

export async function removeContainer(nameOrId: string, force = false) {
  const container = docker.getContainer(nameOrId);
  await container.remove({ force });
}

export async function getContainerLogs(nameOrId: string, tail = 100): Promise<string> {
  const container = docker.getContainer(nameOrId);
  const logs = await container.logs({
    stdout: true,
    stderr: true,
    tail,
    timestamps: true
  });
  return logs.toString('utf-8');
}

export function streamContainerLogs(nameOrId: string, onData: (data: string) => void, onError: (err: Error) => void) {
  const container = docker.getContainer(nameOrId);
  container.logs({
    stdout: true,
    stderr: true,
    follow: true,
    tail: 50
  }, (err, stream) => {
    if (err) {
      onError(err);
      return;
    }
    if (stream) {
      stream.on('data', (chunk: Buffer) => {
        // Docker log format has 8-byte header, skip it
        const data = chunk.slice(8).toString('utf-8');
        onData(data);
      });
      stream.on('error', onError);
    }
  });
}

export async function buildImage(contextPath: string, imageName: string, onProgress?: (msg: string) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    docker.buildImage(
      { context: contextPath, src: ['.'] },
      { t: imageName },
      (err, stream) => {
        if (err) {
          reject(err);
          return;
        }
        if (stream) {
          stream.on('data', (chunk: Buffer) => {
            try {
              const lines = chunk.toString().split('\n').filter(Boolean);
              for (const line of lines) {
                const json = JSON.parse(line);
                if (json.stream && onProgress) {
                  onProgress(json.stream);
                }
                if (json.error) {
                  reject(new Error(json.error));
                }
              }
            } catch {}
          });
          stream.on('end', resolve);
          stream.on('error', reject);
        }
      }
    );
  });
}

export { docker };
