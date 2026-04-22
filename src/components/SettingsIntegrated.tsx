import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Database, Key, X } from "lucide-react";
import { api, type HealthStatus, type Settings, type User } from "../lib/api";

export function SettingsIntegrated({
  isManager,
  currentUser,
}: {
  isManager: boolean;
  currentUser: User | null;
}) {
  const [settings, setSettings] = useState<Settings>({
    githubPatConfigured: false,
  });
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [githubPat, setGithubPat] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [nextSettings, nextHealth] = await Promise.all([api.settings(), api.health()]);
        setSettings(nextSettings);
        setHealth(nextHealth);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to load settings");
      }
    };
    void load();
  }, []);

  const saveRepositoryAccess = async () => {
    try {
      setSaving(true);
      const updated = await api.updateSettings({
        githubPat: githubPat || null,
      });
      setSettings(updated);
      setGithubPat("");
      setMessage("Repository access updated.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to update repository access"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-neutral-500">
          Settings
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
          Workspace controls
        </h1>
        <p className="mt-3 max-w-2xl text-base text-neutral-600">
          Manage the repository access that SecureFlow uses for onboarding and scan runs.
        </p>
        {message ? <Notice message={message} onClose={() => setMessage("")} /> : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <Panel
            icon={<Key className="h-5 w-5 text-lime-800" />}
            iconClass="bg-lime-100"
            title="Repository access"
          >
            <SecretField
              label="GitHub personal access token"
              hint="Optional"
              placeholder={
                settings.githubPatConfigured
                  ? "Configured. Enter a new token to replace it."
                  : "ghp_xxxxxxxxxxxxxxxxxxxx"
              }
              value={githubPat}
              disabled={!isManager || saving}
              onChange={setGithubPat}
              onUpdate={() => void saveRepositoryAccess()}
            />
            <p className="text-sm leading-relaxed text-neutral-600">
              Use a GitHub token only for private repositories or to reduce anonymous rate-limit
              failures during scans.
            </p>
          </Panel>
          {!isManager ? (
            <p className="text-xs text-neutral-500">
              Managers can update repository access. Developers can review the current
              configuration.
            </p>
          ) : null}
        </div>

        <div className="space-y-6">
          <div className="rounded-[1.8rem] border border-neutral-200 bg-white p-6">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-neutral-600" />
              <h3 className="text-lg font-semibold tracking-tight text-neutral-950">
                System information
              </h3>
            </div>
            <div className="mt-5 space-y-3 text-sm">
              <Row label="Version" value={health?.version ?? "Loading..."} />
              <Row label="Storage" value={health ? capitalize(health.storage) : "Loading..."} />
              <Row label="Service" value={health?.service ?? "Loading..."} />
              <Row label="Current user" value={currentUser?.username ?? "Unknown"} />
              <div className="flex items-center justify-between">
                <span className="text-neutral-600">Status</span>
                <div className="inline-flex items-center gap-2 rounded-full bg-lime-50 px-3 py-1 text-xs font-semibold text-lime-800">
                  <span className="h-2 w-2 rounded-full bg-lime-500" />
                  {health?.ok ? "Online" : "Checking"}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[1.8rem] border border-lime-200 bg-lime-50 p-6">
            <h3 className="text-lg font-semibold tracking-tight text-neutral-950">
              Access model
            </h3>
            <div className="mt-4 space-y-3 text-sm text-neutral-700">
              <Rule text="Managers add repositories, trigger scans, create tickets, assign developers, and manage settings." />
              <Rule text="Developers can browse the workspace and move only the tickets assigned to them." />
              <Rule text="Authentication is username-based, so the app does not depend on verified email addresses." />
            </div>
          </div>

          <div className="rounded-[1.8rem] border border-neutral-200 bg-white p-6">
            <h3 className="text-lg font-semibold tracking-tight text-neutral-950">
              Scan notes
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-neutral-600">
              SecureFlow clones the target repository at scan time, runs the OSV scanner
              recursively, and converts the findings into actionable tickets on the board.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Panel({
  icon,
  iconClass,
  title,
  children,
}: {
  icon: ReactNode;
  iconClass: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[1.8rem] border border-neutral-200 bg-white p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${iconClass}`}>
          {icon}
        </div>
        <h2 className="text-xl font-semibold tracking-tight text-neutral-950">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function SecretField({
  label,
  hint,
  placeholder,
  value,
  disabled,
  onChange,
  onUpdate,
}: {
  label: string;
  hint?: string;
  placeholder: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onUpdate: () => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700">
        {label} {hint ? <span className="text-neutral-400">{hint}</span> : null}
      </label>
      <div className="mt-2 flex gap-2">
        <input
          disabled={disabled}
          type="password"
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 flex-1 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 font-mono text-sm outline-none transition focus:border-neutral-950 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <button
          type="button"
          disabled={disabled || !value.trim()}
          onClick={onUpdate}
          className="rounded-2xl border border-neutral-200 bg-neutral-100 px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Update
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-neutral-600">{label}</span>
      <span className="font-mono text-sm font-semibold text-neutral-950">{value}</span>
    </div>
  );
}

function Rule({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-1 h-2.5 w-2.5 rounded-full bg-lime-500" />
      <span>{text}</span>
    </div>
  );
}

function Notice({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700">
      <span>{message}</span>
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function capitalize(value: string): string {
  return value ? value[0]!.toUpperCase() + value.slice(1) : value;
}
