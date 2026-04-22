import { FormEvent, useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  AtSign,
  Code,
  Crown,
  Search,
  TrendingUp,
  UserPlus,
  X,
} from "lucide-react";
import { api, type User, type UserRole } from "../lib/api";
import {
  isStrongPasswordInput,
  isValidDisplayNameInput,
  isValidUsernameInput,
  normalizeUsernameInput,
  sanitizeNameInput,
} from "../lib/validators";

export function TeamIntegrated({
  isManager,
  currentUser,
}: {
  isManager: boolean;
  currentUser: User | null;
}) {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    name: "",
    username: "",
    role: "developer" as UserRole,
    password: "",
  });

  const loadUsers = async () => {
    try {
      setUsers(await api.users());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load team");
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addMember = async (event: FormEvent) => {
    event.preventDefault();
    const sanitizedName = sanitizeNameInput(form.name);
    const normalizedUsername = normalizeUsernameInput(form.username);

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
    if (form.password && !isStrongPasswordInput(form.password)) {
      setMessage(
        "Password must be at least 8 characters and include upper, lower, and numeric characters."
      );
      return;
    }

    try {
      const created = await api.createUser({
        name: sanitizedName,
        username: normalizedUsername,
        role: form.role,
        ...(form.password ? { password: form.password } : {}),
      });
      setUsers((current) => [...current, created]);
      setForm({ name: "", username: "", role: "developer", password: "" });
      setShowAdd(false);
      setMessage(
        created.temporaryPassword
          ? `Added ${created.name}. Temporary password: ${created.temporaryPassword}`
          : `Added ${created.name}.`
      );
      await loadUsers();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to add member");
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!isManager || user.id === currentUser?.id) return;
    const confirmed = window.confirm(
      `Delete ${user.name}? Assigned tickets will become unassigned.`
    );
    if (!confirmed) return;

    try {
      setDeletingUserId(user.id);
      await api.deleteUser(user.id);
      setUsers((current) => current.filter((item) => item.id !== user.id));
      setSelectedUser((current) => (current?.id === user.id ? null : current));
      setMessage(`Removed ${user.name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to remove member");
    } finally {
      setDeletingUserId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-neutral-500">
              Team
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
              Roles and workload
            </h1>
            <p className="mt-3 max-w-2xl text-base text-neutral-600">
              Track who is in the workspace, what role they hold, and how much ticket work is
              currently assigned.
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            disabled={!isManager}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-neutral-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <UserPlus className="h-4 w-4" />
            Add Member
          </button>
        </div>

        <div className="mt-6 max-w-md">
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by name or username..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-12 w-full rounded-2xl border border-neutral-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-neutral-950"
            />
          </label>
        </div>

        {message ? <Notice message={message} onClose={() => setMessage("")} /> : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {filteredUsers.map((user, index) => {
          const RoleIcon = user.role === "manager" ? Crown : Code;
          const managerCard = user.role === "manager";
          const metrics = user.metrics ?? { assigned: 0, inProgress: 0, completed: 0 };
          const completionRate =
            metrics.assigned > 0
              ? Math.round((metrics.completed / metrics.assigned) * 100)
              : 0;

          return (
            <motion.button
              key={user.id}
              type="button"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: index * 0.05 }}
              onClick={() => setSelectedUser(user)}
              className="group rounded-[1.6rem] border border-neutral-200 bg-white p-6 text-left transition hover:border-neutral-300"
            >
              <div className="flex items-start gap-4">
                <div className="relative flex-shrink-0">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-950 text-lg font-bold text-white">
                    {user.avatar}
                  </div>
                  <div
                    className={`absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white ${
                      managerCard ? "bg-lime-500 text-neutral-950" : "bg-neutral-900 text-white"
                    }`}
                  >
                    <RoleIcon className="h-3.5 w-3.5" />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-semibold tracking-tight text-neutral-950 group-hover:text-neutral-700">
                      {user.name}
                    </h3>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                        managerCard
                          ? "bg-lime-100 text-lime-800"
                          : "bg-neutral-100 text-neutral-700"
                      }`}
                    >
                      {user.role}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-2 text-sm text-neutral-500">
                    <AtSign className="h-4 w-4" />
                    <span className="truncate">{user.username}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3">
                <Stat
                  label="Assigned"
                  value={metrics.assigned}
                  className="border-neutral-200 bg-neutral-50 text-neutral-950"
                />
                <Stat
                  label="In Progress"
                  value={metrics.inProgress}
                  className="border-blue-100 bg-blue-50 text-blue-700"
                />
                <Stat
                  label="Completed"
                  value={metrics.completed}
                  className="border-lime-200 bg-lime-50 text-lime-800"
                />
              </div>

              <div className="mt-5 border-t border-neutral-100 pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-sm text-neutral-600">
                    <TrendingUp className="h-4 w-4" />
                    <span className="font-medium">Completion rate</span>
                  </div>
                  <span className="font-mono text-sm font-bold">{completionRate}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${completionRate}%` }}
                    transition={{ duration: 0.8, delay: 0.2 + index * 0.06 }}
                    className="h-full rounded-full bg-lime-500"
                  />
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {filteredUsers.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-[1.6rem] border-2 border-dashed border-neutral-300 bg-neutral-50 px-6 py-14 text-center"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm">
            <Search className="h-7 w-7 text-neutral-400" />
          </div>
          <h3 className="mt-5 text-xl font-semibold text-neutral-950">No matching members</h3>
          <p className="mt-2 text-neutral-600">
            Try a different username search or add a new account.
          </p>
        </motion.div>
      ) : null}

      {showAdd && isManager ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 sm:p-6">
          <form
            onSubmit={addMember}
            className="w-full max-w-lg rounded-[1.8rem] border border-neutral-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-neutral-950">
                  Add team member
                </h2>
                <p className="mt-2 text-sm text-neutral-600">
                  Create a developer or manager account with a username and password.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="rounded-xl p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-950"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 grid gap-4">
              <Field
                label="Full name"
                value={form.name}
                onChange={(value) => setForm({ ...form, name: value })}
                required
              />
              <Field
                label="Username"
                value={form.username}
                onChange={(value) => setForm({ ...form, username: value })}
                required
              />
              <label className="block text-sm font-medium text-neutral-700">
                Role
                <select
                  value={form.role}
                  onChange={(event) =>
                    setForm({ ...form, role: event.target.value as UserRole })
                  }
                  className="mt-2 h-12 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 outline-none transition focus:border-neutral-950"
                >
                  <option value="developer">Developer</option>
                  <option value="manager">Manager</option>
                </select>
              </label>
              <Field
                label="Password"
                value={form.password}
                onChange={(value) => setForm({ ...form, password: value })}
                type="password"
                hint="Leave blank to generate a temporary password."
              />
            </div>

            <button className="mt-6 w-full rounded-2xl bg-neutral-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800">
              Add Member
            </button>
          </form>
        </div>
      ) : null}

      {selectedUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 sm:p-6">
          <div className="w-full max-w-md rounded-[1.8rem] border border-neutral-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-neutral-950">
                  {selectedUser.name}
                </h2>
                <p className="mt-2 text-sm text-neutral-500">@{selectedUser.username}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="rounded-xl p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-950"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Info label="Role" value={selectedUser.role} />
              <Info label="Assigned" value={String(selectedUser.metrics?.assigned ?? 0)} />
              <Info
                label="In progress"
                value={String(selectedUser.metrics?.inProgress ?? 0)}
              />
              <Info label="Completed" value={String(selectedUser.metrics?.completed ?? 0)} />
            </div>
            {isManager && selectedUser.id !== currentUser?.id ? (
              <button
                type="button"
                onClick={() => void handleDeleteUser(selectedUser)}
                disabled={deletingUserId === selectedUser.id}
                className="mt-6 w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:border-red-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletingUserId === selectedUser.id ? "Removing..." : "Delete member"}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  hint?: string;
}) {
  return (
    <label className="block text-sm font-medium text-neutral-700">
      <div className="flex items-center justify-between gap-3">
        <span>{label}</span>
        {hint ? <span className="text-xs text-neutral-400">{hint}</span> : null}
      </div>
      <input
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
        spellCheck={false}
        className="mt-2 h-12 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 outline-none transition focus:border-neutral-950"
      />
    </label>
  );
}

function Stat({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${className}`}>
      <div className="text-2xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
        {label}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
      <div className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold capitalize text-neutral-900">{value}</div>
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
