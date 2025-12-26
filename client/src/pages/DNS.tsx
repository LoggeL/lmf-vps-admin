import { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, Globe, Shield, ShieldOff } from 'lucide-react';
import { api } from '@/lib/api';

const DNS_TYPES = ['A', 'AAAA', 'CNAME', 'TXT', 'MX', 'NS'];

interface DnsRecord {
  id: string;
  name: string;
  type: string;
  content: string;
  proxied: boolean;
  ttl: number;
}

interface EditState {
  name: string;
  type: string;
  content: string;
  proxied: boolean;
}

export default function DNS() {
  const [records, setRecords] = useState<DnsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [configStatus, setConfigStatus] = useState<{ configured: boolean; zoneId: string | null }>({ configured: false, zoneId: null });
  
  // Config form
  const [token, setToken] = useState('');
  const [zoneId, setZoneId] = useState('');
  
  // New record form
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('A');
  const [newContent, setNewContent] = useState('135.125.207.21');
  const [newProxied, setNewProxied] = useState(true);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ name: '', type: '', content: '', proxied: false });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      const config = await api.getDnsConfig();
      setConfigStatus(config);
      
      if (config.configured) {
        const recordsData = await api.getDnsRecords();
        setRecords(recordsData);
      }
    } catch (err) {
      console.error('Failed to fetch DNS:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveConfig = async () => {
    try {
      await api.setDnsConfig(token, zoneId);
      setToken('');
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddRecord = async () => {
    try {
      await api.createDnsRecord({ name: newName, content: newContent, type: newType, proxied: newProxied });
      setShowAdd(false);
      setNewName('');
      setNewType('A');
      setNewContent('135.125.207.21');
      setNewProxied(true);
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const startEditing = (record: DnsRecord) => {
    setEditingId(record.id);
    setEditState({
      name: record.name,
      type: record.type,
      content: record.content,
      proxied: record.proxied
    });
  };

  const handleUpdateRecord = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await api.updateDnsRecord(editingId, {
        name: editState.name,
        type: editState.type,
        content: editState.content,
        proxied: editState.proxied
      });
      setEditingId(null);
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecord = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}?`)) return;
    try {
      await api.deleteDnsRecord(id);
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const toggleProxied = async (record: DnsRecord) => {
    try {
      await api.updateDnsRecord(record.id, { proxied: !record.proxied });
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!configStatus.configured) {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-2xl font-bold">DNS Management</h1>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4">
          <div className="text-center mb-4">
            <Globe className="w-12 h-12 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-400">Configure Cloudflare to manage DNS records</p>
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-2">API Token</label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Cloudflare API token"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-primary"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-2">Zone ID</label>
            <input
              type="text"
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              placeholder="Zone ID from Cloudflare dashboard"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-primary"
            />
          </div>
          
          <button
            onClick={handleSaveConfig}
            disabled={!token || !zoneId}
            className="w-full py-3 bg-primary hover:bg-primary-dark disabled:bg-gray-700 rounded-lg font-medium transition-colors"
          >
            Save Configuration
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">DNS Records</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark rounded-lg transition-colors"
        >
          <Plus size={18} />
          Add Record
        </button>
      </div>

      {/* Add Record Modal */}
      {showAdd && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 space-y-4">
          <h3 className="font-semibold text-lg">Add DNS Record</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="subdomain.logge.top"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-primary font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Type</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-primary text-sm"
              >
                {DNS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Content</label>
              <input
                type="text"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="IP or value"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-primary font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Proxy</label>
              <button
                type="button"
                onClick={() => setNewProxied(!newProxied)}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  newProxied 
                    ? 'bg-orange-500/20 border-orange-500 text-orange-400' 
                    : 'bg-gray-800 border-gray-700 text-gray-400'
                }`}
              >
                {newProxied ? <Shield size={16} /> : <ShieldOff size={16} />}
                {newProxied ? 'Proxied' : 'DNS Only'}
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddRecord}
              disabled={!newName || !newContent}
              className="px-4 py-2 bg-primary hover:bg-primary-dark disabled:bg-gray-700 rounded-lg transition-colors"
            >
              Add Record
            </button>
          </div>
        </div>
      )}

      {/* Records Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-800/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400 w-24">Type</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Content</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-400 w-28">Proxy</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-400 w-28">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {records.map((record) => (
              <tr key={record.id} className="hover:bg-gray-800/50">
                {editingId === record.id ? (
                  // Edit mode
                  <>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={editState.name}
                        onChange={(e) => setEditState({ ...editState, name: e.target.value })}
                        className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm font-mono"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={editState.type}
                        onChange={(e) => setEditState({ ...editState, type: e.target.value })}
                        className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm"
                      >
                        {DNS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={editState.content}
                        onChange={(e) => setEditState({ ...editState, content: e.target.value })}
                        className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm font-mono"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => setEditState({ ...editState, proxied: !editState.proxied })}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs transition-colors ${
                          editState.proxied 
                            ? 'bg-orange-500/20 text-orange-400' 
                            : 'bg-gray-700 text-gray-400'
                        }`}
                      >
                        {editState.proxied ? <Shield size={12} /> : <ShieldOff size={12} />}
                        {editState.proxied ? 'On' : 'Off'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={handleUpdateRecord}
                          disabled={saving}
                          className="p-1.5 hover:bg-gray-700 rounded text-green-500"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1.5 hover:bg-gray-700 rounded text-gray-500"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  // View mode
                  <>
                    <td className="px-4 py-3 text-sm font-mono">{record.name}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-0.5 bg-gray-800 rounded text-xs">{record.type}</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-300 truncate max-w-xs" title={record.content}>
                      {record.content}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleProxied(record)}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs transition-colors ${
                          record.proxied 
                            ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30' 
                            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                        }`}
                        title="Click to toggle"
                      >
                        {record.proxied ? <Shield size={12} /> : <ShieldOff size={12} />}
                        {record.proxied ? 'On' : 'Off'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => startEditing(record)}
                          className="p-1.5 hover:bg-gray-700 rounded text-gray-400"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteRecord(record.id, record.name)}
                          className="p-1.5 hover:bg-gray-700 rounded text-red-500"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No DNS records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
