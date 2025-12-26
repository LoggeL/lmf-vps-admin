import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Play, Square, RotateCcw, ExternalLink, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';

export default function Apps() {
  const [apps, setApps] = useState<any[]>([]);
  const [containers, setContainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [appsData, containersData] = await Promise.all([
        api.getApps(),
        api.getContainers()
      ]);
      setApps(appsData);
      setContainers(containersData);
    } catch (err) {
      console.error('Failed to fetch apps:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getContainerState = (containerName: string) => {
    const container = containers.find(c => c.name === containerName);
    return container?.state || 'unknown';
  };

  const handleAction = async (appId: string, action: 'start' | 'stop' | 'restart') => {
    setActionLoading(appId);
    try {
      if (action === 'start') await api.startApp(appId);
      else if (action === 'stop') await api.stopApp(appId);
      else if (action === 'restart') await api.restartApp(appId);
      await fetchData();
    } catch (err) {
      console.error(`Failed to ${action} app:`, err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (appId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    
    setActionLoading(appId);
    try {
      await api.deleteApp(appId);
      await fetchData();
    } catch (err) {
      console.error('Failed to delete app:', err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Apps</h1>
        <Link
          to="/apps/new"
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark rounded-lg transition-colors"
        >
          <Plus size={18} />
          Deploy New App
        </Link>
      </div>

      {apps.length === 0 ? (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
          <p className="text-gray-400 mb-4">No apps deployed yet</p>
          <Link
            to="/apps/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark rounded-lg transition-colors"
          >
            <Plus size={18} />
            Deploy Your First App
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {apps.map((app: any) => {
            const state = getContainerState(app.container_name);
            const isRunning = state === 'running';
            const isLoading = actionLoading === app.id;

            return (
              <div
                key={app.id}
                className="bg-gray-900 rounded-xl border border-gray-800 p-5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Link to={`/apps/${app.id}`} className="text-lg font-semibold hover:text-primary">
                        {app.name}
                      </Link>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        isRunning
                          ? 'bg-green-500/10 text-green-500'
                          : 'bg-red-500/10 text-red-500'
                      }`}>
                        {state}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <a
                        href={`https://${app.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-primary"
                      >
                        {app.domain}
                        <ExternalLink size={14} />
                      </a>
                      <span>Port {app.port}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isRunning ? (
                      <>
                        <button
                          onClick={() => handleAction(app.id, 'restart')}
                          disabled={isLoading}
                          className="p-2 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
                          title="Restart"
                        >
                          <RotateCcw size={18} />
                        </button>
                        <button
                          onClick={() => handleAction(app.id, 'stop')}
                          disabled={isLoading}
                          className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-red-500 disabled:opacity-50"
                          title="Stop"
                        >
                          <Square size={18} />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleAction(app.id, 'start')}
                        disabled={isLoading}
                        className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-green-500 disabled:opacity-50"
                        title="Start"
                      >
                        <Play size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(app.id, app.name)}
                      disabled={isLoading}
                      className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-red-500 disabled:opacity-50"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
