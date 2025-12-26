import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Play, Square, RotateCcw, RefreshCw, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';

export default function AppDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [app, setApp] = useState<any>(null);
  const [logs, setLogs] = useState('');
  const [deployments, setDeployments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [containers, setContainers] = useState<any[]>([]);

  const fetchData = async () => {
    if (!id) return;
    try {
      const [appData, logsData, deploymentsData, containersData] = await Promise.all([
        api.getApp(id),
        api.getAppLogs(id),
        api.getDeployments(id),
        api.getContainers()
      ]);
      setApp(appData);
      setLogs(logsData.logs);
      setDeployments(deploymentsData);
      setContainers(containersData);
    } catch (err) {
      console.error('Failed to fetch app:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [id]);

  const getContainerState = () => {
    const container = containers.find(c => c.name === app?.container_name);
    return container?.state || 'unknown';
  };

  const handleAction = async (action: 'start' | 'stop' | 'restart') => {
    if (!id) return;
    setActionLoading(true);
    try {
      if (action === 'start') await api.startApp(id);
      else if (action === 'stop') await api.stopApp(id);
      else if (action === 'restart') await api.restartApp(id);
      await fetchData();
    } catch (err) {
      console.error(`Failed to ${action}:`, err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!id) return;
    setUpdating(true);
    try {
      await api.updateApp(id);
      await fetchData();
    } catch (err) {
      console.error('Failed to update:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !app) return;
    if (!confirm(`Are you sure you want to delete ${app.name}?`)) return;
    
    try {
      await api.deleteApp(id);
      navigate('/apps');
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!app) {
    return <div className="text-center text-gray-400">App not found</div>;
  }

  const state = getContainerState();
  const isRunning = state === 'running';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/apps')} className="p-2 hover:bg-gray-800 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{app.name}</h1>
          <a
            href={`https://${app.domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-primary flex items-center gap-1"
          >
            {app.domain}
            <ExternalLink size={14} />
          </a>
        </div>
        <span className={`px-3 py-1 rounded-lg text-sm ${
          isRunning ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
        }`}>
          {state}
        </span>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {isRunning ? (
          <>
            <button
              onClick={() => handleAction('restart')}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <RotateCcw size={18} />
              Restart
            </button>
            <button
              onClick={() => handleAction('stop')}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50"
            >
              <Square size={18} />
              Stop
            </button>
          </>
        ) : (
          <button
            onClick={() => handleAction('start')}
            disabled={actionLoading}
            className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-500 hover:bg-green-500/20 rounded-lg transition-colors disabled:opacity-50"
          >
            <Play size={18} />
            Start
          </button>
        )}
        <button
          onClick={handleUpdate}
          disabled={updating}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw size={18} className={updating ? 'animate-spin' : ''} />
          {updating ? 'Updating...' : 'Update'}
        </button>
        <button
          onClick={handleDelete}
          className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors ml-auto"
        >
          <Trash2 size={18} />
          Delete
        </button>
      </div>

      {/* Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <p className="text-sm text-gray-400 mb-1">GitHub</p>
          <a href={app.github_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all">
            {app.github_url}
          </a>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <p className="text-sm text-gray-400 mb-1">Container</p>
          <p className="font-mono text-sm">{app.container_name}</p>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <p className="text-sm text-gray-400 mb-1">Port</p>
          <p className="font-mono text-sm">{app.port}</p>
        </div>
      </div>

      {/* Logs */}
      <div className="bg-gray-900 rounded-xl border border-gray-800">
        <div className="p-4 border-b border-gray-800">
          <h2 className="font-semibold">Logs</h2>
        </div>
        <pre className="p-4 text-sm font-mono text-gray-300 overflow-x-auto max-h-96 overflow-y-auto whitespace-pre-wrap">
          {logs || 'No logs available'}
        </pre>
      </div>

      {/* Deployments */}
      <div className="bg-gray-900 rounded-xl border border-gray-800">
        <div className="p-4 border-b border-gray-800">
          <h2 className="font-semibold">Recent Deployments</h2>
        </div>
        <div className="divide-y divide-gray-800">
          {deployments.map((d: any) => (
            <div key={d.id} className="p-4 flex items-center justify-between">
              <div>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  d.status === 'success' ? 'bg-green-500/10 text-green-500' :
                  d.status === 'failed' ? 'bg-red-500/10 text-red-500' :
                  'bg-yellow-500/10 text-yellow-500'
                }`}>
                  {d.status}
                </span>
                {d.commit_hash && (
                  <span className="ml-2 text-sm text-gray-500 font-mono">
                    {d.commit_hash.substring(0, 7)}
                  </span>
                )}
              </div>
              <span className="text-sm text-gray-500">
                {new Date(d.created_at).toLocaleString()}
              </span>
            </div>
          ))}
          {deployments.length === 0 && (
            <p className="p-4 text-gray-500 text-center">No deployments yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
