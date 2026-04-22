import { FormEvent, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Menu, Shield } from "lucide-react";
import { Sidebar } from "./components/Sidebar";
import { DashboardIntegrated } from "./components/DashboardIntegrated";
import { KanbanBoard } from "./components/KanbanBoard";
import { ProjectsIntegrated } from "./components/ProjectsIntegrated";
import { TeamIntegrated } from "./components/TeamIntegrated";
import { SettingsIntegrated } from "./components/SettingsIntegrated";
import {
  api,
  clearAuthToken,
  setAuthToken,
  type User,
  type UserRole,
} from "./lib/api";
import {
  isStrongPasswordInput,
  isValidDisplayNameInput,
  isValidUsernameInput,
  normalizeUsernameInput,
  sanitizeNameInput,
} from "./lib/validators";

const viewLabels: Record<string, string> = {
  dashboard: "Overview",
  kanban: "Board",
  projects: "Projects",
  team: "Team",
  settings: "Settings",
};

export default function App() {
  const [activeView, setActiveView] = useState("dashboard");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [registerRole, setRegisterRole] = useState<UserRole>("developer");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<User | null>(null);
  const [message, setMessage] = useState("");
  const [loadingSession, setLoadingSession] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const boot = async () => {
      try {
        const session = await api.me();
        setLoggedInUser(session.user);
        setIsAuthenticated(true);
      } catch {
        clearAuthToken();
        setIsAuthenticated(false);
      } finally {
        setLoadingSession(false);
      }
    };
    void boot();
  }, []);

  const resetAuthFields = () => {
    setName("");
    setUsername("");
    setPassword("");
    setConfirmPassword("");
    setRegisterRole("developer");
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedUsername = normalizeUsernameInput(username);

    if (!normalizedUsername || !password) {
      setMessage("Username and password are required.");
      return;
    }
    if (!isValidUsernameInput(normalizedUsername)) {
      setMessage("Enter a valid username.");
      return;
    }

    try {
      const result = await api.login({
        username: normalizedUsername,
        password,
      });
      setAuthToken(result.token);
      setLoggedInUser(result.user);
      setIsAuthenticated(true);
      setMessage("");
      setPassword("");
      window.history.pushState({ page: "workspace" }, "", `${window.location.pathname}#workspace`);
    } catch (error) {
      setPassword("");
      setMessage(error instanceof Error ? error.message : "Login failed");
    }
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const sanitizedName = sanitizeNameInput(name);
    const normalizedUsername = normalizeUsernameInput(username);

    if (!sanitizedName || !normalizedUsername || !password || !confirmPassword) {
      setMessage("All registration fields are required.");
      return;
    }
    if (!isValidDisplayNameInput(sanitizedName)) {
      setMessage("Full name must be at least 2 characters long.");
      return;
    }
    if (!isValidUsernameInput(normalizedUsername)) {
      setMessage(
        "Username must be 3-32 characters and use only lowercase letters, numbers, dots, underscores, or hyphens."
      );
      return;
    }
    if (!isStrongPasswordInput(password)) {
      setMessage(
        "Password must be at least 8 characters and include upper, lower, and numeric characters."
      );
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      setPassword("");
      setConfirmPassword("");
      return;
    }

    try {
      const result = await api.register({
        name: sanitizedName,
        username: normalizedUsername,
        role: registerRole,
        password,
      });
      setAuthToken(result.token);
      setLoggedInUser(result.user);
      setIsAuthenticated(true);
      setMessage("");
      resetAuthFields();
    } catch (error) {
      setPassword("");
      setConfirmPassword("");
      setMessage(error instanceof Error ? error.message : "Registration failed");
    }
  };

  const handleLogout = () => {
    clearAuthToken();
    setIsAuthenticated(false);
    setLoggedInUser(null);
    setPassword("");
    setActiveView("dashboard");
    setMobileNavOpen(false);
    setMessage("You have been signed out.");
    window.history.replaceState({ page: "login" }, "", window.location.pathname);
  };

  const switchAuthMode = (mode: "login" | "register") => {
    setAuthMode(mode);
    setMessage("");
    resetAuthFields();
  };

  const handleViewChange = (view: string) => {
    setActiveView(view);
    setMobileNavOpen(false);
  };

  const renderView = () => {
    const isManager = loggedInUser?.role === "manager";
    switch (activeView) {
      case "dashboard":
        return <DashboardIntegrated onViewChange={handleViewChange} />;
      case "kanban":
        return <KanbanBoard currentUser={loggedInUser} />;
      case "projects":
        return <ProjectsIntegrated isManager={isManager} />;
      case "team":
        return <TeamIntegrated isManager={isManager} currentUser={loggedInUser} />;
      case "settings":
        return <SettingsIntegrated isManager={isManager} currentUser={loggedInUser} />;
      default:
        return <DashboardIntegrated onViewChange={handleViewChange} />;
    }
  };

  if (loadingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 text-sm text-neutral-200">
        Restoring workspace...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="auth-page">
        <div className="auth-page__glow auth-page__glow--left" />
        <div className="auth-page__glow auth-page__glow--right" />
        <div className="auth-page__grid" />

        <div className="auth-layout">
          <section className="auth-panel">
            <div className="auth-brand">
              <div className="auth-brand__icon">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="auth-brand__eyebrow">SecureFlow</p>
                <h1 className="auth-panel__title">
                  {authMode === "login" ? "Sign in to your workspace" : "Create your account"}
                </h1>
              </div>
            </div>

            <p className="auth-panel__subtitle">
              Username-based authentication, role-aware access, and live ticket workflows for
              vulnerability remediation teams.
            </p>

            <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
              <button
                type="button"
                onClick={() => switchAuthMode("login")}
                className={`auth-tabs__button ${authMode === "login" ? "is-active" : ""}`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => switchAuthMode("register")}
                className={`auth-tabs__button ${authMode === "register" ? "is-active" : ""}`}
              >
                Register
              </button>
            </div>

            <form className="auth-form" onSubmit={authMode === "login" ? handleLogin : handleRegister}>
              {authMode === "register" ? (
                <>
                  <Field
                    id="name"
                    label="Full name"
                    value={name}
                    onChange={setName}
                    autoComplete="name"
                  />

                  <div className="auth-row">
                    <Field
                      id="username"
                      label="Username"
                      value={username}
                      onChange={setUsername}
                      autoComplete="username"
                    />
                    <label className="auth-field">
                      <span className="auth-field__label">Role</span>
                      <select
                        value={registerRole}
                        onChange={(event) => setRegisterRole(event.target.value as UserRole)}
                        className="auth-input"
                      >
                        <option value="developer">Developer</option>
                        <option value="manager">Manager</option>
                      </select>
                    </label>
                  </div>
                </>
              ) : (
                <Field
                  id="username"
                  label="Username"
                  value={username}
                  onChange={setUsername}
                  autoComplete="username"
                />
              )}

              <Field
                id="password"
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                autoComplete={authMode === "login" ? "current-password" : "new-password"}
              />

              {authMode === "register" ? (
                <Field
                  id="confirmPassword"
                  label="Confirm password"
                  type="password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  autoComplete="new-password"
                />
              ) : null}

              <button type="submit" className="auth-submit">
                {authMode === "login" ? "Log In" : "Create Account"}
              </button>
            </form>

            {message ? <div className="auth-message">{message}</div> : null}

            <p className="auth-note">
              Register either a manager or a developer account. Managers can create projects,
              scans, and tickets. Developers can work on their assigned remediation tickets.
            </p>
          </section>

          <aside className="auth-hero">
            <h2 className="auth-hero__title">
              Register once, scan repos, and route fixes without fake data in the loop.
            </h2>
            <p className="auth-hero__text">
              SecureFlow is wired for real project onboarding: username auth, role-based actions,
              GitHub repository scans, and ticket tracking from discovery to remediation.
            </p>

            <div className="auth-hero__stack">
              <PromoCard
                title="Manager workflow"
                body="Add repositories, queue scans, create manual tickets, assign developers, and manage scan settings."
              />
              <PromoCard
                title="Developer workflow"
                body="See the full board, open ticket details, and update the status of assigned findings without elevated access."
              />
              <PromoCard
                title="Clean startup"
                body="No seeded users, tickets, or projects. The workspace initializes cleanly and builds from real input."
              />
            </div>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-950">
      <div className="fixed inset-0 pointer-events-none opacity-20 dot-pattern" />

      <Sidebar
        activeView={activeView}
        onViewChange={handleViewChange}
        currentUser={loggedInUser}
        mobileOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      <div className="relative lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/88 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                className="rounded-xl border border-neutral-200 p-2 text-neutral-700 hover:bg-neutral-100 lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
                  Workspace
                </p>
                <h1 className="text-lg font-semibold tracking-tight">
                  {viewLabels[activeView] ?? "Overview"}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-700 sm:block">
                <span className="font-medium text-neutral-950">{loggedInUser?.name}</span>
                <span className="text-neutral-400"> · </span>
                <span className="capitalize">{loggedInUser?.role}</span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl bg-neutral-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800"
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
            className="min-h-[calc(100vh-4rem)]"
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label htmlFor={id} className="auth-field">
      <span className="auth-field__label">{label}</span>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        className="auth-input"
      />
    </label>
  );
}

function PromoCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="auth-promo">
      <h3 className="auth-promo__title">{title}</h3>
      <p className="auth-promo__body">{body}</p>
    </div>
  );
}
