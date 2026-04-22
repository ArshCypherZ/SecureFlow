import { ClipboardEvent, FormEvent, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sidebar } from "./components/Sidebar";
import { DashboardIntegrated } from "./components/DashboardIntegrated";
import { KanbanBoard } from "./components/KanbanBoard";
import { ProjectsIntegrated } from "./components/ProjectsIntegrated";
import { TeamIntegrated } from "./components/TeamIntegrated";
import { SettingsIntegrated } from "./components/SettingsIntegrated";

type RegisteredUser = {
  username: string;
  password: string;
  name: string;
};

const REGISTERED_USERS: RegisteredUser[] = [
  {
    username: "secureflow-user",
    password: "SecureFlow@123",
    name: "SecureFlow Demo User",
  },
];

const MAX_FAILED_ATTEMPTS = 3;
const STORAGE_KEY = "secureflow-registered-users";

export default function App() {
  const [activeView, setActiveView] = useState("dashboard");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<RegisteredUser | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [message, setMessage] = useState("");
  const [users, setUsers] = useState<RegisteredUser[]>(REGISTERED_USERS);

  useEffect(() => {
    const storedUsers = window.localStorage.getItem(STORAGE_KEY);
    if (!storedUsers) return;

    try {
      const parsed = JSON.parse(storedUsers) as RegisteredUser[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setUsers(parsed);
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  }, [users]);

  const resetAuthFields = () => {
    setName("");
    setUsername("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isLocked) {
      setMessage("Account is locked. Contact support to unlock access.");
      return;
    }

    const enteredUsername = username.trim();
    const enteredPassword = password;

    if (!enteredUsername || !enteredPassword) {
      setMessage("Username and password are required.");
      return;
    }

    const matchedUser = users.find((user) => user.username === enteredUsername);

    if (!matchedUser || matchedUser.password !== enteredPassword) {
      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);
      setPassword("");
      if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
        setIsLocked(true);
        setMessage("Account locked after multiple failed login attempts.");
      } else {
        setMessage("Incorrect username or password. Please try again.");
      }
      return;
    }

    setFailedAttempts(0);
    setMessage("");
    setIsAuthenticated(true);
    setLoggedInUser(matchedUser);
    setPassword("");
    window.history.pushState({ page: "workspace" }, "", `${window.location.pathname}#workspace`);
  };

  const handleRegister = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const enteredName = name.trim();
    const enteredUsername = username.trim();
    const enteredPassword = password;
    const enteredConfirmPassword = confirmPassword;

    if (!enteredName || !enteredUsername || !enteredPassword || !enteredConfirmPassword) {
      setMessage("All registration fields are required.");
      return;
    }

    if (enteredPassword !== enteredConfirmPassword) {
      setMessage("Passwords do not match.");
      setPassword("");
      setConfirmPassword("");
      return;
    }

    if (users.some((user) => user.username === enteredUsername)) {
      setMessage("That username is already registered. Please choose another one.");
      return;
    }

    const newUser: RegisteredUser = {
      name: enteredName,
      username: enteredUsername,
      password: enteredPassword,
    };

    setUsers((currentUsers) => [...currentUsers, newUser]);
    setAuthMode("login");
    setFailedAttempts(0);
    setIsLocked(false);
    setMessage("Registration successful. You can now log in with your new account.");
    setName("");
    setConfirmPassword("");
    setPassword("");
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setLoggedInUser(null);
    setPassword("");
    setActiveView("dashboard");
    setMessage("You have been logged out.");
    window.history.replaceState({ page: "login" }, "", window.location.pathname);
  };

  const preventClipboard = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    setPassword("");
    setConfirmPassword("");
    setMessage("Copy, cut, and paste are disabled for the password field.");
  };

  const switchAuthMode = (mode: "login" | "register") => {
    setAuthMode(mode);
    setMessage("");
    setFailedAttempts(0);
    setIsLocked(false);
    resetAuthFields();
  };

  const renderView = () => {
    switch (activeView) {
      case "dashboard":
        return <DashboardIntegrated onViewChange={setActiveView} />;
      case "kanban":
        return <KanbanBoard />;
      case "projects":
        return <ProjectsIntegrated />;
      case "team":
        return <TeamIntegrated />;
      case "settings":
        return <SettingsIntegrated />;
      default:
        return <DashboardIntegrated onViewChange={setActiveView} />;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-neutral-200 rounded-xl shadow-sm p-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-neutral-900">
                {authMode === "login" ? "SecureFlow Login" : "Create Your SecureFlow Account"}
              </h1>
              <p className="text-sm text-neutral-600 mt-2">
                {authMode === "login"
                  ? "Enter your credentials to continue."
                  : "Register a new user to access the dashboard."}
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 rounded-lg bg-neutral-100 p-1">
            <button
              type="button"
              onClick={() => switchAuthMode("login")}
              className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                authMode === "login" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-600"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => switchAuthMode("register")}
              className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                authMode === "register" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-600"
              }`}
            >
              Register
            </button>
          </div>

          <form
            className="mt-6 space-y-4"
            onSubmit={authMode === "login" ? handleLogin : handleRegister}
          >
            {authMode === "register" ? (
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-neutral-700">
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium text-neutral-700">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-neutral-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={authMode === "login" ? "current-password" : "new-password"}
                onCopy={preventClipboard}
                onCut={preventClipboard}
                onPaste={preventClipboard}
                className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            {authMode === "register" ? (
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-neutral-700">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  onCopy={preventClipboard}
                  onCut={preventClipboard}
                  onPaste={preventClipboard}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
            ) : null}

            <button
              type="submit"
              disabled={authMode === "login" && isLocked}
              className="w-full py-2.5 rounded-md bg-neutral-900 text-white font-medium disabled:bg-neutral-400 disabled:cursor-not-allowed"
            >
              {authMode === "login" ? "Log In" : "Create Account"}
            </button>
          </form>

          {message ? (
            <p className="mt-4 text-sm text-neutral-700" role="status">
              {message}
            </p>
          ) : null}

          <p className="mt-4 text-xs text-neutral-500">
            Demo account: <span className="font-mono">secureflow-user</span> /{" "}
            <span className="font-mono">SecureFlow@123</span>. New accounts are stored in your
            browser for this project.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 relative">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 dot-pattern opacity-40 pointer-events-none" />
      
      {/* Main Layout */}
      <div className="relative flex">
        <Sidebar activeView={activeView} onViewChange={setActiveView} />
        
        <main className="flex-1 ml-64 min-h-screen">
          <div className="flex justify-end items-center gap-3 p-4 border-b border-neutral-200 bg-white/80 backdrop-blur sticky top-0 z-10">
            <span className="text-sm text-neutral-700">
              Signed in as <strong>{loggedInUser?.name}</strong>
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm rounded-md bg-neutral-900 text-white"
            >
              Sign Out
            </button>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
