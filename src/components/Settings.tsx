import React, { useState, useEffect } from 'react';
import { Key, User, Mail, Save, CheckCircle2, AlertCircle, Trash2, Download, Shield } from 'lucide-react';
import { initializeClaude, isClaudeInitialized, getApiKeyFromEnv } from '../services/claudeService';
import { getSettings, saveSettings, clearAllReports } from '../services/storageService';
import { AppSettings } from '../types';

interface SettingsProps {
  onExport: () => void;
  reportCount: number;
}

export const Settings: React.FC<SettingsProps> = ({ onExport, reportCount }) => {
  const [settings, setSettings] = useState<AppSettings>({
    autoAnalyze: true,
    theme: 'dark',
  });
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claudeReady, setClaudeReady] = useState(false);

  const envKey = getApiKeyFromEnv();

  useEffect(() => {
    loadSettings();
    setClaudeReady(isClaudeInitialized());
    // If env key exists, show masked version
    if (envKey) {
      setApiKey('sk-ant-...loaded from .env');
    }
  }, []);

  const loadSettings = async () => {
    try {
      const loaded = await getSettings();
      setSettings(loaded);
      if (loaded.apiKey) {
        setApiKey(loaded.apiKey);
        initializeClaude(loaded.apiKey);
        setClaudeReady(true);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const handleSave = async () => {
    try {
      setError(null);

      // Validate API key format
      if (apiKey && !apiKey.startsWith('sk-ant-')) {
        setError('API key should start with "sk-ant-"');
        return;
      }

      const newSettings: AppSettings = {
        ...settings,
        apiKey: apiKey || undefined,
      };

      await saveSettings(newSettings);

      if (apiKey) {
        initializeClaude(apiKey);
        setClaudeReady(true);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError('Failed to save settings');
    }
  };

  const handleClearData = async () => {
    if (!confirm(`Are you sure you want to delete ALL ${reportCount} reports? This cannot be undone.`)) {
      return;
    }
    if (!confirm('This is your last chance. Delete everything?')) {
      return;
    }
    try {
      await clearAllReports();
      window.location.reload();
    } catch (err) {
      setError('Failed to clear data');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* API Configuration */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <h2 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
          <Key className="w-4 h-4 text-red-500" />
          Claude API Configuration
        </h2>

        <div className="space-y-4">
          {/* Status */}
          <div className={`flex items-center gap-2 p-3 rounded-lg ${
            claudeReady
              ? 'bg-emerald-500/10 border border-emerald-500/30'
              : 'bg-yellow-500/10 border border-yellow-500/30'
          }`}>
            {claudeReady ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-emerald-400 font-medium">Claude API Connected</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-yellow-400 font-medium">API Key Required</span>
              </>
            )}
          </div>

          {/* API Key Input */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              Anthropic API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-red-500 font-mono text-sm"
            />
            <p className="text-[10px] text-slate-500 mt-2">
              Get your API key from{' '}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-400 hover:underline"
              >
                console.anthropic.com
              </a>
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-400">{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Default Values */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <h2 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
          <User className="w-4 h-4 text-red-500" />
          Default Values
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              Default Caseworker Name
            </label>
            <input
              type="text"
              value={settings.defaultCaseworker || ''}
              onChange={(e) => setSettings({ ...settings, defaultCaseworker: e.target.value })}
              placeholder="Jeff Franzen"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-red-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              Default Caseworker Email
            </label>
            <input
              type="email"
              value={settings.defaultCaseworkerEmail || ''}
              onChange={(e) => setSettings({ ...settings, defaultCaseworkerEmail: e.target.value })}
              placeholder="jeff.franzen@example.org"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-red-500 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        className={`w-full py-4 rounded-xl font-bold text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
          saved
            ? 'bg-emerald-600 text-white'
            : 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/30'
        }`}
      >
        {saved ? (
          <>
            <CheckCircle2 className="w-4 h-4" />
            Saved!
          </>
        ) : (
          <>
            <Save className="w-4 h-4" />
            Save Settings
          </>
        )}
      </button>

      {/* Data Management */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <h2 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
          <Shield className="w-4 h-4 text-red-500" />
          Data Management
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-slate-300">Export All Data</p>
              <p className="text-xs text-slate-500">{reportCount} reports in database</p>
            </div>
            <button
              onClick={onExport}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
            <div>
              <p className="text-sm font-medium text-red-400">Clear All Data</p>
              <p className="text-xs text-slate-500">Permanently delete all reports</p>
            </div>
            <button
              onClick={handleClearData}
              disabled={reportCount === 0}
              className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <h2 className="text-sm font-black text-white uppercase tracking-widest mb-4">
          About RescueLens
        </h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          RescueLens is a disaster damage assessment tool powered by Claude AI.
          It helps disaster response volunteers and emergency responders quickly classify
          property damage using FEMA PDA guidelines.
        </p>
        <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>Version 2.0.0 (Claude Edition)</span>
          <span>Built with Opus 4.5</span>
        </div>
      </div>
    </div>
  );
};

export default Settings;
