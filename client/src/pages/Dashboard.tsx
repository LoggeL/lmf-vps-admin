import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Cpu, HardDrive, MemoryStick, Box, Activity, Plus, MessageSquare } from 'lucide-react';
import { api } from '@/lib/api';
import AutoRefreshBar from '@/components/AutoRefreshBar';

interface Stats {
  cpu: { usage: number; cores: number };
  memory: { total: number; used: number; usagePercent: number };
  disk: { mount: string; size: number; used: number; usagePercent: number }[];
  uptime: number;
}

interface OpenCodeSession {
  id: string;
  title: string;
  directory: string;
  time: {
    created: number;
    updated: number;
  };
}

function formatBytes(bytes: number) {
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(1)} GB`;
}

function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return `${days}d ${hours}h`;
}

function formatRelativeTime(timestamp: number) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [containers, setContainers] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [sessions, setSessions] = useState<OpenCodeSession[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const [statsData, containersData, appsData, sessionsData] = await Promise.all([
        api.getStats(),
        api.getContainers(),
        api.getApps(),
        api.getSessions()
      ]);
      setStats(statsData);
      setContainers(containersData);
      setApps(appsData);
      setSessions(sessionsData);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const runningContainers = containers.filter(c => c.state === 'running').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          <Link
            to="/apps/new"
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark rounded-lg transition-colors"
          >
            <Plus size={18} />
            Deploy App
          </Link>
        </div>
      </div>

      <AutoRefreshBar interval={10000} onRefresh={fetchData} className="rounded-full" />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Cpu className="w-5 h-5 text-blue-500" />
            </div>
            <span className="text-gray-400">CPU Usage</span>
          </div>
          <p className="text-2xl font-bold">{stats?.cpu.usage ?? '--'}%</p>
          <p className="text-sm text-gray-500">{stats?.cpu.cores ?? '--'} cores</p>
        </div>

        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <MemoryStick className="w-5 h-5 text-purple-500" />
            </div>
            <span className="text-gray-400">Memory</span>
          </div>
          <p className="text-2xl font-bold">{stats?.memory.usagePercent ?? '--'}%</p>
          <p className="text-sm text-gray-500">
            {stats ? `${formatBytes(stats.memory.used)} / ${formatBytes(stats.memory.total)}` : '--'}
          </p>
        </div>

        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <HardDrive className="w-5 h-5 text-orange-500" />
            </div>
            <span className="text-gray-400">Disk</span>
          </div>
          <p className="text-2xl font-bold">{stats?.disk[0]?.usagePercent ?? '--'}%</p>
          <p className="text-sm text-gray-500">
            {stats?.disk[0] ? `${formatBytes(stats.disk[0].used)} / ${formatBytes(stats.disk[0].size)}` : '--'}
          </p>
        </div>

        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <span className="text-gray-400">Uptime</span>
          </div>
          <p className="text-2xl font-bold">{stats ? formatUptime(stats.uptime) : '--'}</p>
          <p className="text-sm text-gray-500">{runningContainers} containers running</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Apps */}
        <div className="bg-gray-900 rounded-xl border border-gray-800">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <Box size={18} />
              Apps ({apps.length})
            </h2>
            <Link to="/apps" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-gray-800">
            {apps.slice(0, 5).map((app: any) => (
              <Link
                key={app.id}
                to={`/apps/${app.id}`}
                className="flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors"
              >
                <div>
                  <p className="font-medium">{app.name}</p>
                  <p className="text-sm text-gray-500">{app.domain}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${
                  containers.find(c => c.name === app.container_name)?.state === 'running'
                    ? 'bg-green-500/10 text-green-500'
                    : 'bg-red-500/10 text-red-500'
                }`}>
                  {containers.find(c => c.name === app.container_name)?.state || 'unknown'}
                </span>
              </Link>
            ))}
            {apps.length === 0 && (
              <p className="p-4 text-gray-500 text-center">No apps deployed yet</p>
            )}
          </div>
        </div>

        {/* Sessions */}
        <div className="bg-gray-900 rounded-xl border border-gray-800">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <MessageSquare size={18} />
              OpenCode Sessions ({sessions.length})
            </h2>
            <Link to="/sessions" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-gray-800">
            {sessions.slice(0, 5).map((session) => (
              <Link
                key={session.id}
                to={`/sessions/${session.id}`}
                className="flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{session.title || 'Untitled Session'}</p>
                  <p className="text-sm text-gray-500 font-mono truncate">{session.directory}</p>
                </div>
                <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">
                  {formatRelativeTime(session.time?.updated || session.time?.created || Date.now())}
                </span>
              </Link>
            ))}
            {sessions.length === 0 && (
              <p className="p-4 text-gray-500 text-center">No sessions yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
