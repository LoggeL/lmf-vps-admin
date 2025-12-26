import { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, Globe } from 'lucide-react';
import { api } from '@/lib/api';

export default function DNS() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [configStatus, setConfigStatus] = useState<{ configured: boolean; zoneId: string | null }>({ configured: false, zoneId: null });
  
  // Config form
  const [token, setToken] = useState('');
  const [zoneId, setZoneId] = useState('');
  
  // New record form
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newContent, setNewContent] = useState('135.125.207.21');
  const [newProxied, setNewProxied] = useState(true);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

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
      await api.createDnsRecord({ name: newName, content: newContent, proxied: newProxied });
      setShowAdd(false);
      setNewName('');
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateRecord = async (id: string) => {
    try {
      await api.updateDnsRecord(id, { content: editContent });
      setEditingId(null);
      await fetchData();
    } catch (err: any) {
      alert(err.message);
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
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 space-y-4">
          <h3 className="font-semibold">Add DNS Record</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="subdomain.logge.top"
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-primary"
            />
            <input
              type="text"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="IP address"
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-primary"
            />
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newProxied}
                onChange={(e) => setNewProxied(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-400">Proxied</span>
            </label>
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
              disabled={!newName}
              className="px-4 py-2 bg-primary hover:bg-primary-dark disabled:bg-gray-700 rounded-lg transition-colors"
            >
              Add
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
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Type</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Content</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Proxy</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {records.filter(r => r.type === 'A' || r.type === 'CNAME').map((record) => (
              <tr key={record.id} className="hover:bg-gray-800/50">
                <td className="px-4 py-3 text-sm font-mono">{record.name}</td>
                <td className="px-4 py-3 text-sm">
                  <span className="px-2 py-0.5 bg-gray-800 rounded text-xs">{record.type}</span>
                </td>
                <td className="px-4 py-3 text-sm font-mono">
                  {editingId === record.id ? (
                    <input
                      type="text"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm"
                    />
                  ) : (
                    record.content
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    record.proxied ? 'bg-orange-500/10 text-orange-500' : 'bg-gray-500/10 text-gray-500'
                  }`}>
                    {record.proxied ? 'On' : 'Off'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {editingId === record.id ? (
                      <>
                        <button
                          onClick={() => handleUpdateRecord(record.id)}
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
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => { setEditingId(record.id); setEditContent(record.content); }}
                          className="p-1.5 hover:bg-gray-700 rounded text-gray-400"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteRecord(record.id, record.name)}
                          className="p-1.5 hover:bg-gray-700 rounded text-red-500"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
