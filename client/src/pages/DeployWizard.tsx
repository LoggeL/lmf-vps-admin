import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Github, Globe, Server, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

export default function DeployWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [githubUrl, setGithubUrl] = useState('');
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [port, setPort] = useState('3000');
  const [envVars, setEnvVars] = useState<{ key: string; value: string }[]>([]);

  const extractRepoName = (url: string) => {
    const match = url.match(/github\.com\/[\w-]+\/([\w-]+)/);
    return match ? match[1].toLowerCase() : '';
  };

  const handleUrlChange = (url: string) => {
    setGithubUrl(url);
    const repoName = extractRepoName(url);
    if (repoName && !name) {
      setName(repoName);
      setDomain(`${repoName}.logge.top`);
    }
  };

  const handleDeploy = async () => {
    setLoading(true);
    setError('');

    try {
      const envVarsObj = envVars.reduce((acc, { key, value }) => {
        if (key) acc[key] = value;
        return acc;
      }, {} as Record<string, string>);

      await api.deployApp({
        githubUrl,
        name,
        domain,
        port: parseInt(port),
        envVars: envVarsObj
      });

      navigate('/apps');
    } catch (err: any) {
      setError(err.message || 'Deployment failed');
    } finally {
      setLoading(false);
    }
  };

  const addEnvVar = () => {
    setEnvVars([...envVars, { key: '', value: '' }]);
  };

  const updateEnvVar = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...envVars];
    updated[index][field] = value;
    setEnvVars(updated);
  };

  const removeEnvVar = (index: number) => {
    setEnvVars(envVars.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/apps')} className="p-2 hover:bg-gray-800 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold">Deploy New App</h1>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map(s => (
          <div
            key={s}
            className={`flex-1 h-1 rounded-full ${s <= step ? 'bg-primary' : 'bg-gray-800'}`}
          />
        ))}
      </div>

      {/* Step 1: GitHub URL */}
      {step === 1 && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <Github className="w-6 h-6 text-primary" />
            <h2 className="text-lg font-semibold">GitHub Repository</h2>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Repository URL</label>
            <input
              type="url"
              value={githubUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://github.com/user/repo"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-primary"
            />
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={!githubUrl}
            className="w-full py-3 bg-primary hover:bg-primary-dark disabled:bg-gray-700 rounded-lg font-medium transition-colors"
          >
            Continue
          </button>
        </div>
      )}

      {/* Step 2: Configuration */}
      {step === 2 && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <Server className="w-6 h-6 text-primary" />
            <h2 className="text-lg font-semibold">Configuration</h2>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">App Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="my-app"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Domain</label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="app.logge.top"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Port</label>
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              placeholder="3000"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!name || !domain || !port}
              className="flex-1 py-3 bg-primary hover:bg-primary-dark disabled:bg-gray-700 rounded-lg font-medium transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Environment Variables */}
      {step === 3 && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-6 h-6 text-primary" />
            <h2 className="text-lg font-semibold">Environment Variables</h2>
          </div>

          <div className="space-y-2">
            {envVars.map((env, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={env.key}
                  onChange={(e) => updateEnvVar(index, 'key', e.target.value)}
                  placeholder="KEY"
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-primary font-mono text-sm"
                />
                <input
                  type="text"
                  value={env.value}
                  onChange={(e) => updateEnvVar(index, 'value', e.target.value)}
                  placeholder="value"
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-primary font-mono text-sm"
                />
                <button
                  onClick={() => removeEnvVar(index)}
                  className="px-3 py-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              onClick={addEnvVar}
              className="w-full py-2 border border-dashed border-gray-700 rounded-lg text-gray-400 hover:border-gray-600 hover:text-gray-300 transition-colors"
            >
              + Add Variable
            </button>
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setStep(2)}
              disabled={loading}
              className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Back
            </button>
            <button
              onClick={handleDeploy}
              disabled={loading}
              className="flex-1 py-3 bg-primary hover:bg-primary-dark disabled:bg-gray-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Deploying...
                </>
              ) : (
                'Deploy'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Summary */}
      {step > 1 && (
        <div className="bg-gray-800/50 rounded-xl p-4 text-sm">
          <p className="text-gray-400">
            <span className="text-gray-300">{name || 'app'}</span> will be deployed from{' '}
            <span className="text-primary">{githubUrl}</span> to{' '}
            <span className="text-primary">{domain}</span> on port{' '}
            <span className="text-primary">{port}</span>
          </p>
        </div>
      )}
    </div>
  );
}
