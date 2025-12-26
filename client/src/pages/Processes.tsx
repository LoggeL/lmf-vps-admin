import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Trash2, Search, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { api } from '@/lib/api';
import AutoRefreshBar from '@/components/AutoRefreshBar';

function formatMemory(kb: number) {
  if (kb > 1024 * 1024) return `${(kb / (1024 * 1024)).toFixed(1)} GB`;
  if (kb > 1024) return `${(kb / 1024).toFixed(1)} MB`;
  return `${kb} KB`;
}

export default function Processes() {
  const [processes, setProcesses] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<string>('cpu');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filter, setFilter] = useState('');

  const fetchProcesses = useCallback(async () => {
    try {
      const data = await api.getProcesses();
      setProcesses(data.list);
      setSummary({
        all: data.all,
        running: data.running,
        blocked: data.blocked,
        sleeping: data.sleeping,
        unknown: data.unknown,
      });
    } catch (err) {
      console.error('Failed to fetch processes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProcesses();
  }, [fetchProcesses]);

  const handleKill = async (pid: number, name: string) => {
    if (!confirm(`Are you sure you want to kill process "${name}" (PID: ${pid})?`)) return;
    try {
      await api.killProcess(pid);
      fetchProcesses();
    } catch (err: any) {
      alert(`Failed to kill process: ${err.message}`);
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedProcesses = [...processes]
    .filter(p => p.name.toLowerCase().includes(filter.toLowerCase()) || p.pid.toString().includes(filter))
    .sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      
      // Use memRss for sorting if sorting by mem
      if (sortField === 'mem') {
        valA = a.memRss || 0;
        valB = b.memRss || 0;
      }
      
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  const topCpu = [...processes].sort((a, b) => b.cpu - a.cpu).slice(0, 5);
  const topMem = [...processes].sort((a, b) => (b.memRss || 0) - (a.memRss || 0)).slice(0, 5);

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
        <h1 className="text-2xl font-bold text-white">Process Manager</h1>
        <button
          onClick={() => fetchProcesses()}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-primary"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      <AutoRefreshBar interval={5000} onRefresh={fetchProcesses} className="rounded-full" />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">Top CPU Consumers</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topCpu} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#fff' }}
                  itemStyle={{ color: '#d90429' }}
                  cursor={{ fill: 'transparent' }}
                />
                <Bar dataKey="cpu" fill="#d90429" radius={[0, 4, 4, 0]} barSize={20}>
                  {topCpu.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#d90429' : '#8b0000'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">Top Memory Consumers</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topMem} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#fff' }}
                  itemStyle={{ color: '#3b82f6' }}
                  cursor={{ fill: 'transparent' }}
                  formatter={(value: any) => formatMemory(Number(value || 0))}
                />
                <Bar dataKey="memRss" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20}>
                  {topMem.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : '#1d4ed8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <div className="text-sm text-gray-400">Total Processes</div>
          <div className="text-2xl font-bold text-primary">{summary?.all || 0}</div>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <div className="text-sm text-gray-400">Running</div>
          <div className="text-2xl font-bold text-green-500">{summary?.running || 0}</div>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <div className="text-sm text-gray-400">Sleeping</div>
          <div className="text-2xl font-bold text-blue-500">{summary?.sleeping || 0}</div>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <div className="text-sm text-gray-400">Blocked</div>
          <div className="text-2xl font-bold text-red-500">{summary?.blocked || 0}</div>
        </div>
      </div>

      {/* Search & Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search processes..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-primary text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400 cursor-pointer hover:text-white" onClick={() => handleSort('pid')}>PID</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400 cursor-pointer hover:text-white" onClick={() => handleSort('name')}>Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400 cursor-pointer hover:text-white" onClick={() => handleSort('user')}>User</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400 cursor-pointer hover:text-white" onClick={() => handleSort('cpu')}>CPU %</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400 cursor-pointer hover:text-white" onClick={() => handleSort('mem')}>Memory</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400 cursor-pointer hover:text-white" onClick={() => handleSort('started')}>Started</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {sortedProcesses.slice(0, 50).map((proc) => (
                <tr key={proc.pid} className="hover:bg-gray-800/50 group">
                  <td className="px-4 py-3 text-sm text-gray-500 font-mono">{proc.pid}</td>
                  <td className="px-4 py-3 text-sm font-medium text-white">
                    <div className="flex items-center gap-2">
                      {proc.name}
                      {proc.command && (
                        <div className="group-hover:opacity-100 opacity-0 transition-opacity relative">
                          <Info size={14} className="text-gray-500 hover:text-primary cursor-help" />
                          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-64 p-2 bg-black border border-gray-700 rounded text-xs text-gray-300 z-10 pointer-events-none break-all shadow-xl hidden group-hover:block">
                            {proc.command} {proc.params}
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">{proc.user}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary" 
                          style={{ width: `${Math.min(proc.cpu, 100)}%` }}
                        />
                      </div>
                      <span className="font-mono">{proc.cpu.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500" 
                          style={{ width: `${Math.min(proc.mem, 100)}%` }}
                        />
                      </div>
                      <span className="font-mono">{formatMemory(proc.memRss || 0)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{proc.started ? new Date(proc.started).toLocaleTimeString() : '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleKill(proc.pid, proc.name)}
                      className="p-1.5 hover:bg-gray-700 text-red-500 rounded transition-colors"
                      title="Kill Process"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-4 text-center text-xs text-gray-500 border-t border-gray-800">
            Showing top 50 processes sorted by {sortField}
          </div>
        </div>
      </div>
    </div>
  );
}
