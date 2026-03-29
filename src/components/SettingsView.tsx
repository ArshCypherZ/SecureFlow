import { useState } from "react";
import { motion } from "motion/react";
import { Bell, Shield, Key, Save, Database, Sparkles } from "lucide-react";

export function SettingsView() {
  const [notifications, setNotifications] = useState(true);
  const [autoScan, setAutoScan] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(false);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-5xl font-bold tracking-tight mb-2 font-serif italic">
          Settings
        </h1>
        <p className="text-lg text-neutral-600">
          Manage your application preferences and configurations
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Main Settings */}
        <div className="col-span-8 space-y-6">
          {/* Notifications */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Bell className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold">Notifications</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl border border-neutral-100">
                <div className="flex-1">
                  <h4 className="font-medium mb-1">Push Notifications</h4>
                  <p className="text-sm text-neutral-600">
                    Receive real-time notifications for new vulnerabilities
                  </p>
                </div>
                <button
                  onClick={() => setNotifications(!notifications)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    notifications ? "bg-lime-400" : "bg-neutral-300"
                  }`}
                >
                  <motion.div
                    animate={{ x: notifications ? 24 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm"
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl border border-neutral-100">
                <div className="flex-1">
                  <h4 className="font-medium mb-1">Email Alerts</h4>
                  <p className="text-sm text-neutral-600">
                    Get email notifications for critical vulnerabilities
                  </p>
                </div>
                <button
                  onClick={() => setEmailAlerts(!emailAlerts)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    emailAlerts ? "bg-lime-400" : "bg-neutral-300"
                  }`}
                >
                  <motion.div
                    animate={{ x: emailAlerts ? 24 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm"
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Security Scanning */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-orange-600" />
              </div>
              <h2 className="text-xl font-semibold">Security Scanning</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl border border-neutral-100">
                <div className="flex-1">
                  <h4 className="font-medium mb-1">Automatic Scanning</h4>
                  <p className="text-sm text-neutral-600">
                    Automatically scan repositories on push events
                  </p>
                </div>
                <button
                  onClick={() => setAutoScan(!autoScan)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    autoScan ? "bg-lime-400" : "bg-neutral-300"
                  }`}
                >
                  <motion.div
                    animate={{ x: autoScan ? 24 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm"
                  />
                </button>
              </div>
            </div>
          </div>

          {/* API Keys */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <Key className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold">API Configuration</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  GitHub Personal Access Token
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    className="flex-1 px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all text-sm font-mono"
                  />
                  <button className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 rounded-lg transition-colors text-sm font-medium">
                    Update
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  OSV API Key <span className="text-neutral-400 font-normal">(Optional)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="Uses public API by default"
                    className="flex-1 px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all text-sm font-mono"
                  />
                  <button className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 rounded-lg transition-colors text-sm font-medium">
                    Update
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button className="w-full px-6 py-3 bg-black text-white rounded-lg hover:bg-neutral-800 transition-colors font-medium flex items-center justify-center gap-2">
            <Save className="w-5 h-5" />
            Save All Settings
          </button>
        </div>

        {/* Sidebar Info */}
        <div className="col-span-4 space-y-6">
          {/* System Info */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Database className="w-4 h-4 text-neutral-600" />
              <h3 className="font-semibold">System Information</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-600">Version</span>
                <span className="font-mono font-semibold">v1.2.3</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Database</span>
                <span className="font-mono">PostgreSQL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Cache</span>
                <span className="font-mono">Redis</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-600">Status</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-lime-400 rounded-full animate-pulse" />
                  <span className="font-medium text-lime-700">Online</span>
                </div>
              </div>
            </div>
          </div>

          {/* What's New */}
          <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-violet-600" />
              <h3 className="font-semibold">What's New</h3>
            </div>
            <p className="text-sm text-neutral-700 mb-4">
              Check out the latest features in v1.2.3
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-lime-600 mt-0.5">●</span>
                <span className="text-neutral-700">Real-time WebSocket updates</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lime-600 mt-0.5">●</span>
                <span className="text-neutral-700">Enhanced Kanban board</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lime-600 mt-0.5">●</span>
                <span className="text-neutral-700">Improved performance</span>
              </li>
            </ul>
          </div>

          {/* About */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-6">
            <h3 className="font-semibold mb-3">About SecureFlow</h3>
            <p className="text-sm text-neutral-600 mb-4">
              Real-time vulnerability management platform designed for modern development teams.
            </p>
            <div className="flex gap-2">
              <button className="flex-1 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 rounded-lg text-sm font-medium transition-colors">
                Docs
              </button>
              <button className="flex-1 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 rounded-lg text-sm font-medium transition-colors">
                Support
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
