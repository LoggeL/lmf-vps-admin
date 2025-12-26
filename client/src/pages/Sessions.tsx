import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, MessageSquare, Trash2, FolderOpen, Clock, Send, Search, ChevronDown } from 'lucide-react';
import { api } from '@/lib/api';

interface OpenCodeSession {
  id: string;
  title: string;
  directory: string;
  time: {
    created: number;
    updated: number;
  };
  summary: {
    additions: number;
    deletions: number;
    files: number;
  };
}

interface Model {
  id: string;
  name: string;
  provider: string;
}

export default function Sessions() {
  const [sessions, setSessions] = useState<OpenCodeSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newWorkingDir, setNewWorkingDir] = useState('/home/fedora');
  const [initialPrompt, setInitialPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [availableModels, setAvailableModels] = useState<Model[]>([]);
  const [creating, setCreating] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const navigate = useNavigate();

  const fetchSessions = async () => {
    try {
      const data = await api.getSessions();
      setSessions(data);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const settings = await api.getSettings();
      setAvailableModels(settings.availableModels || []);
      setSelectedModel(settings.defaultModel || '');
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };

  useEffect(() => {
    fetchSessions();
    fetchSettings();
  }, []);

  // Filter models based on search
  const filteredModels = useMemo(() => {
    if (!modelSearch) return availableModels.slice(0, 50); // Show first 50 if no search
    const search = modelSearch.toLowerCase();
    return availableModels
      .filter(m => 
        m.name.toLowerCase().includes(search) || 
        m.provider.toLowerCase().includes(search) ||
        m.id.toLowerCase().includes(search)
      )
      .slice(0, 50);
  }, [availableModels, modelSearch]);

  // Get selected model display name
  const selectedModelDisplay = useMemo(() => {
    const model = availableModels.find(m => m.id === selectedModel);
    return model ? `${model.name} (${model.provider})` : selectedModel || 'Select a model...';
  }, [availableModels, selectedModel]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const session = await api.createSession(newWorkingDir, selectedModel, initialPrompt);
      navigate(`/sessions/${session.id}`);
    } catch (err: any) {
      alert(`Failed to create session: ${err.message}`);
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete session "${title}"?`)) return;
    try {
      await api.deleteSession(id);
      await fetchSessions();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
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
        <h1 className="text-2xl font-bold text-white">OpenCode Sessions</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark rounded-lg transition-colors"
        >
          <Plus size={18} />
          New Session
        </button>
      </div>

      {/* Create Session Modal */}
      {showCreate && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 space-y-4">
          <h3 className="font-semibold text-white text-lg">Create New Session</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Working Directory</label>
              <input
                type="text"
                value={newWorkingDir}
                onChange={(e) => setNewWorkingDir(e.target.value)}
                placeholder="/home/fedora"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-primary font-mono text-sm text-white"
              />
            </div>
            <div className="relative">
              <label className="block text-sm text-gray-400 mb-2">Model</label>
              <button
                type="button"
                onClick={() => setShowModelDropdown(!showModelDropdown)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-primary text-sm text-white text-left flex items-center justify-between"
              >
                <span className="truncate">{selectedModelDisplay}</span>
                <ChevronDown size={16} className={`transition-transform ${showModelDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showModelDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-80 overflow-hidden">
                  <div className="p-2 border-b border-gray-700">
                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type="text"
                        value={modelSearch}
                        onChange={(e) => setModelSearch(e.target.value)}
                        placeholder="Search models..."
                        className="w-full pl-9 pr-3 py-2 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:border-primary text-sm text-white"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto max-h-60">
                    {filteredModels.map((model) => (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => {
                          setSelectedModel(model.id);
                          setShowModelDropdown(false);
                          setModelSearch('');
                        }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-700 transition-colors ${
                          selectedModel === model.id ? 'bg-primary/20 text-primary' : 'text-white'
                        }`}
                      >
                        <div className="font-medium">{model.name}</div>
                        <div className="text-xs text-gray-400">{model.provider}</div>
                      </button>
                    ))}
                    {filteredModels.length === 0 && (
                      <div className="px-4 py-3 text-sm text-gray-500 text-center">No models found</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Initial Prompt (optional)</label>
            <textarea
              value={initialPrompt}
              onChange={(e) => setInitialPrompt(e.target.value)}
              placeholder="What would you like to work on?"
              rows={3}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-primary text-sm text-white resize-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowCreate(false);
                setInitialPrompt('');
                setShowModelDropdown(false);
              }}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark disabled:bg-gray-700 rounded-lg transition-colors text-white"
            >
              {creating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Send size={16} />
                  {initialPrompt ? 'Create & Send' : 'Create Session'}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
          <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">No sessions yet</p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark rounded-lg transition-colors text-white"
          >
            <Plus size={18} />
            Create Your First Session
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="bg-gray-900 rounded-xl border border-gray-800 p-5 hover:border-gray-700 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <Link
                      to={`/sessions/${session.id}`}
                      className="text-lg font-semibold hover:text-primary text-white truncate"
                    >
                      {session.title || 'Untitled Session'}
                    </Link>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                    <span className="font-mono flex items-center gap-1">
                      <FolderOpen size={14} />
                      {session.directory}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {formatRelativeTime(session.time.updated)}
                    </span>
                    {session.summary.files > 0 && (
                      <span className="text-xs">
                        <span className="text-green-400">+{session.summary.additions}</span>
                        {' / '}
                        <span className="text-red-400">-{session.summary.deletions}</span>
                        {' in '}
                        <span className="text-gray-300">{session.summary.files} files</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <Link
                    to={`/sessions/${session.id}`}
                    className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors"
                  >
                    <MessageSquare size={16} />
                    Open
                  </Link>
                  <button
                    onClick={() => handleDelete(session.id, session.title)}
                    className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-red-500"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
