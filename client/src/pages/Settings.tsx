import { useEffect, useState, useMemo } from 'react';
import { Bell, Lock, Globe, Check, Bot, Search, ChevronDown } from 'lucide-react';
import { api } from '@/lib/api';

interface Model {
  id: string;
  name: string;
  provider: string;
}

export default function Settings() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Discord form
  const [discordUrl, setDiscordUrl] = useState('');
  const [discordSaving, setDiscordSaving] = useState(false);
  const [discordTesting, setDiscordTesting] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Cloudflare
  const [cfToken, setCfToken] = useState('');
  const [cfZoneId, setCfZoneId] = useState('');
  const [cfSaving, setCfSaving] = useState(false);

  // Model
  const [selectedModel, setSelectedModel] = useState('');
  const [modelSaving, setModelSaving] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [settingsData, dnsConfig] = await Promise.all([
          api.getSettings(),
          api.getDnsConfig()
        ]);
        setSettings({ ...settingsData, dnsConfig });
        setSelectedModel(settingsData.defaultModel || '');
      } catch (err) {
        console.error('Failed to fetch settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const availableModels: Model[] = settings?.availableModels || [];

  // Filter models based on search
  const filteredModels = useMemo(() => {
    if (!modelSearch) return availableModels.slice(0, 50);
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

  const handleSaveDiscord = async () => {
    setDiscordSaving(true);
    try {
      await api.setDiscordWebhook(discordUrl);
      setDiscordUrl('');
      const data = await api.getSettings();
      setSettings((s: any) => ({ ...s, ...data }));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDiscordSaving(false);
    }
  };

  const handleTestDiscord = async () => {
    setDiscordTesting(true);
    try {
      await api.testDiscordWebhook();
      alert('Test notification sent!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDiscordTesting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setPasswordSaving(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message);
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleSaveCloudflare = async () => {
    setCfSaving(true);
    try {
      await api.setDnsConfig(cfToken, cfZoneId);
      setCfToken('');
      setCfZoneId('');
      const dnsConfig = await api.getDnsConfig();
      setSettings((s: any) => ({ ...s, dnsConfig }));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCfSaving(false);
    }
  };

  const handleSaveModel = async () => {
    setModelSaving(true);
    try {
      await api.setDefaultModel(selectedModel);
      const data = await api.getSettings();
      setSettings((s: any) => ({ ...s, ...data }));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setModelSaving(false);
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
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Default AI Model */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Bot className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Default AI Model</h2>
        </div>

        <p className="text-sm text-gray-400">
          Default model used for new OpenCode sessions. {availableModels.length} models available.
        </p>

        <div className="relative">
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

        <button
          onClick={handleSaveModel}
          disabled={modelSaving || selectedModel === settings?.defaultModel}
          className="px-4 py-2 bg-primary hover:bg-primary-dark disabled:bg-gray-700 rounded-lg text-sm transition-colors"
        >
          {modelSaving ? 'Saving...' : 'Save Default Model'}
        </button>
      </div>

      {/* Discord Webhook */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Discord Notifications</h2>
        </div>

        <p className="text-sm text-gray-400">
          Receive notifications for deployments, updates, and container crashes.
        </p>

        <div className="flex items-center gap-2">
          <span className="text-sm">Status:</span>
          {settings?.discordWebhook ? (
            <span className="flex items-center gap-1 text-primary text-sm">
              <Check size={14} /> Configured
            </span>
          ) : (
            <span className="text-gray-500 text-sm">Not configured</span>
          )}
        </div>

        <div>
          <input
            type="url"
            value={discordUrl}
            onChange={(e) => setDiscordUrl(e.target.value)}
            placeholder="https://discord.com/api/webhooks/..."
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-primary text-sm"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSaveDiscord}
            disabled={!discordUrl || discordSaving}
            className="px-4 py-2 bg-primary hover:bg-primary-dark disabled:bg-gray-700 rounded-lg text-sm transition-colors"
          >
            {discordSaving ? 'Saving...' : 'Save Webhook'}
          </button>
          {settings?.discordWebhook && (
            <button
              onClick={handleTestDiscord}
              disabled={discordTesting}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
            >
              {discordTesting ? 'Sending...' : 'Send Test'}
            </button>
          )}
        </div>
      </div>

      {/* Cloudflare */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Globe className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Cloudflare DNS</h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm">Status:</span>
          {settings?.dnsConfig?.configured ? (
            <span className="flex items-center gap-1 text-primary text-sm">
              <Check size={14} /> Configured ({settings.dnsConfig.zoneId})
            </span>
          ) : (
            <span className="text-gray-500 text-sm">Not configured</span>
          )}
        </div>

        <div className="space-y-2">
          <input
            type="password"
            value={cfToken}
            onChange={(e) => setCfToken(e.target.value)}
            placeholder="API Token"
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-primary text-sm"
          />
          <input
            type="text"
            value={cfZoneId}
            onChange={(e) => setCfZoneId(e.target.value)}
            placeholder="Zone ID"
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-primary text-sm"
          />
        </div>

        <button
          onClick={handleSaveCloudflare}
          disabled={!cfToken || !cfZoneId || cfSaving}
          className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 rounded-lg text-sm transition-colors"
        >
          {cfSaving ? 'Saving...' : 'Update Cloudflare Config'}
        </button>
      </div>

      {/* Change Password */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Lock className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Change Password</h2>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Current password"
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-primary text-sm"
            required
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password"
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-primary text-sm"
            required
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-primary text-sm"
            required
          />

          {passwordError && <p className="text-red-500 text-sm">{passwordError}</p>}
          {passwordSuccess && <p className="text-green-500 text-sm">Password changed successfully!</p>}

          <button
            type="submit"
            disabled={passwordSaving}
            className="px-4 py-2 bg-primary hover:bg-primary-dark disabled:bg-gray-700 rounded-lg text-sm transition-colors"
          >
            {passwordSaving ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
