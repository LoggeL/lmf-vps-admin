# LMF VPS Admin

A lightweight web-based administration panel for managing Docker containers, deployments, and DNS records on a VPS.

## Features

- **Dashboard**: Real-time system stats (CPU, memory, disk, uptime)
- **App Management**: Deploy and manage Docker containers from GitHub repositories
- **Process Monitor**: View and manage running system processes
- **DNS Management**: Manage Cloudflare DNS records directly from the panel
- **Sessions**: Terminal sessions for server management (WIP - see below)
- **Notifications**: Discord webhook integration for deployment alerts
- **Webhook Support**: GitHub webhooks for automatic deployments

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Vite
- **Backend**: Express 5, TypeScript, Socket.IO
- **Database**: SQLite (via better-sqlite3)
- **Container**: Docker

## Getting Started

### Prerequisites

- Node.js 22+
- Docker
- Git

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd lmf-vps-admin

# Install dependencies
npm run install:all

# Start development servers
npm run dev:server    # Backend on port 3002
npm run dev:client    # Frontend on port 5173
```

### Production

```bash
# Build the client
npm run build

# Start the server
npm start
```

### Docker

```bash
docker build -t lmf-vps-admin .
docker run -d \
  -p 3002:3002 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v ./data:/app/server/data \
  -e SESSION_SECRET=your-secret-here \
  lmf-vps-admin
```

## Configuration

On first run, you'll be prompted to set an admin password. Configuration is stored in the SQLite database.

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SESSION_SECRET` | Session encryption secret | Recommended |
| `PORT` | Server port (default: 3002) | No |

### Integrations

- **Cloudflare**: Configure API token and Zone ID in Settings for DNS management
- **Discord**: Add a webhook URL in Settings for deployment notifications

## Work In Progress

> **Note**: The **OpenCode integration** (AI-powered terminal sessions) is currently a work in progress and may not function fully. The Sessions feature is designed to integrate with the OpenCode CLI tool for AI-assisted development workflows.

## Security

- Single admin password authentication
- Session-based auth with configurable expiry
- All sensitive credentials stored in the database (not in code)
- API tokens are masked in the UI

## License

MIT
