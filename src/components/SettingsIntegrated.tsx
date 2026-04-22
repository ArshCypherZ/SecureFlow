import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { motion } from "motion/react";
import { Bell, Shield, Key, Save, Database, Sparkles, X } from "lucide-react";
import { api, Settings } from "../lib/api";

export function SettingsIntegrated() {
  const [settings, setSettings] = useState<Settings>({
    pushNotifications: true,
    emailAlerts: false,
    automaticScanning: true,
    githubPatConfigured: false,
    osvApiKeyConfigured: false,
  });
  const [githubPat, setGithubPat] = useState("");
  const [osvApiKey, setOsvApiKey] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setSettings(await api.settings());
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to load settings");
      }
    };
    void loadSettings();
  }, []);

  const save = async (includeSecrets = false) => {
    try {
      setSaving(true);
      const updated = await api.updateSettings({
        pushNotifications: settings.pushNotifications,
        emailAlerts: settings.emailAlerts,
        automaticScanning: settings.automaticScanning,
        ...(includeSecrets && githubPat ? { githubPat } : {}),
        ...(includeSecrets && osvApiKey ? { osvApiKey } : {}),
      });
      setSettings(updated);
      setGithubPat("");
      setOsvApiKey("");
      setMessage("Settings saved successfully");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-5xl font-bold tracking-tight mb-2 font-serif italic">Settings</h1>
        <p className="text-lg text-neutral-600">Manage your application preferences and configurations</p>
        {message && <Notice message={message} onClose={() => setMessage("")} />}
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8 space-y-6">
          <Panel icon={<Bell className="w-5 h-5 text-blue-600" />} iconClass="bg-blue-100" title="Notifications">
            <Toggle title="Push Notifications" description="Receive real-time notifications for new vulnerabilities" checked={settings.pushNotifications} onChange={() => setSettings({ ...settings, pushNotifications: !settings.pushNotifications })} />
            <Toggle title="Email Alerts" description="Get email notifications for critical vulnerabilities" checked={settings.emailAlerts} onChange={() => setSettings({ ...settings, emailAlerts: !settings.emailAlerts })} />
          </Panel>

          <Panel icon={<Shield className="w-5 h-5 text-orange-600" />} iconClass="bg-orange-100" title="Security Scanning">
            <Toggle title="Automatic Scanning" description="Automatically scan repositories on push events" checked={settings.automaticScanning} onChange={() => setSettings({ ...settings, automaticScanning: !settings.automaticScanning })} />
          </Panel>

          <Panel icon={<Key className="w-5 h-5 text-green-600" />} iconClass="bg-green-100" title="API Configuration">
            <SecretField label="GitHub Personal Access Token" placeholder={settings.githubPatConfigured ? "Configured. Enter a new token to replace it." : "ghp_xxxxxxxxxxxxxxxxxxxx"} value={githubPat} onChange={setGithubPat} onUpdate={() => save(true)} />
            <SecretField label="OSV API Key" hint="(Optional)" placeholder={settings.osvApiKeyConfigured ? "Configured. Enter a new key to replace it." : "Uses public API by default"} value={osvApiKey} onChange={setOsvApiKey} onUpdate={() => save(true)} />
          </Panel>

          <button disabled={saving} onClick={() => save(false)} className="w-full px-6 py-3 bg-black text-white rounded-lg hover:bg-neutral-800 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50">
            <Save className="w-5 h-5" />
            {saving ? "Saving..." : "Save All Settings"}
          </button>
        </div>

        <div className="col-span-4 space-y-6">
          <div className="bg-white border border-neutral-200 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Database className="w-4 h-4 text-neutral-600" />
              <h3 className="font-semibold">System Information</h3>
            </div>
            <div className="space-y-3 text-sm">
              <Row label="Version" value="v1.2.3" />
              <Row label="Storage" value="In-memory" />
              <Row label="API" value="Express" />
              <div className="flex justify-between items-center">
                <span className="text-neutral-600">Status</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-lime-400 rounded-full animate-pulse" />
                  <span className="font-medium text-lime-700">Online</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-violet-600" />
              <h3 className="font-semibold">What's New</h3>
            </div>
            <p className="text-sm text-neutral-700 mb-4">Frontend buttons are now connected to the in-memory API.</p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2"><span className="text-lime-600 mt-0.5">•</span><span className="text-neutral-700">Ticket details and updates</span></li>
              <li className="flex items-start gap-2"><span className="text-lime-600 mt-0.5">•</span><span className="text-neutral-700">Project scan actions</span></li>
              <li className="flex items-start gap-2"><span className="text-lime-600 mt-0.5">•</span><span className="text-neutral-700">Settings save flow</span></li>
            </ul>
          </div>

          <div className="bg-white border border-neutral-200 rounded-2xl p-6">
            <h3 className="font-semibold mb-3">About SecureFlow</h3>
            <p className="text-sm text-neutral-600 mb-4">Real-time vulnerability management platform designed for modern development teams.</p>
            <div className="flex gap-2">
              <button onClick={() => setMessage("Docs are not configured in this local build yet.")} className="flex-1 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 rounded-lg text-sm font-medium transition-colors">Docs</button>
              <button onClick={() => setMessage("Support contact is not configured in this local build yet.")} className="flex-1 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 rounded-lg text-sm font-medium transition-colors">Support</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Panel({ icon, iconClass, title, children }: { icon: ReactNode; iconClass: string; title: string; children: ReactNode }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconClass}`}>{icon}</div>
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Toggle({ title, description, checked, onChange }: { title: string; description: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl border border-neutral-100">
      <div className="flex-1">
        <h4 className="font-medium mb-1">{title}</h4>
        <p className="text-sm text-neutral-600">{description}</p>
      </div>
      <button onClick={onChange} className={`relative w-12 h-6 rounded-full transition-colors ${checked ? "bg-lime-400" : "bg-neutral-300"}`}>
        <motion.div animate={{ x: checked ? 24 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm" />
      </button>
    </div>
  );
}

function SecretField({ label, hint, placeholder, value, onChange, onUpdate }: { label: string; hint?: string; placeholder: string; value: string; onChange: (value: string) => void; onUpdate: () => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700 mb-2">{label} {hint && <span className="text-neutral-400 font-normal">{hint}</span>}</label>
      <div className="flex gap-2">
        <input type="password" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all text-sm font-mono" />
        <button onClick={onUpdate} className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 rounded-lg transition-colors text-sm font-medium">Update</button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-neutral-600">{label}</span>
      <span className="font-mono font-semibold">{value}</span>
    </div>
  );
}

function Notice({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="mt-4 bg-white border border-neutral-200 rounded-lg px-4 py-3 text-sm text-neutral-700 flex items-center justify-between">
      <span>{message}</span>
      <button onClick={onClose} className="text-neutral-400 hover:text-neutral-900"><X className="w-4 h-4" /></button>
    </div>
  );
}
