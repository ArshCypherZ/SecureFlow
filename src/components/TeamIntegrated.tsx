import { FormEvent, useEffect, useState } from "react";
import { motion } from "motion/react";
import { Mail, Crown, Code, Search, UserPlus, TrendingUp, X } from "lucide-react";
import type { UserRole } from "../lib/mockData";
import { api, User } from "../lib/api";

export function TeamIntegrated() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ name: "", email: "", role: "developer" as UserRole });

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
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addMember = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const created = await api.createUser(form);
      setUsers((current) => [...current, created]);
      setForm({ name: "", email: "", role: "developer" });
      setShowAdd(false);
      setMessage(`Added ${created.name}`);
      await loadUsers();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to add member");
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-5xl font-bold tracking-tight mb-2 font-serif italic">Team</h1>
            <p className="text-lg text-neutral-600">Manage team members and track their progress</p>
          </div>
          <button onClick={() => setShowAdd(true)} className="px-4 py-2 bg-black text-white rounded-lg hover:bg-neutral-800 transition-colors font-medium flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Add Member
          </button>
        </div>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input type="text" placeholder="Search team members..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all text-sm" />
        </div>
        {message && <Notice message={message} onClose={() => setMessage("")} />}
      </div>

      <div className="grid grid-cols-12 gap-4">
        {filteredUsers.map((user, index) => {
          const RoleIcon = user.role === "manager" ? Crown : Code;
          const isManager = user.role === "manager";
          const metrics = user.metrics ?? { assigned: 0, inProgress: 0, completed: 0 };
          const completionRate = metrics.assigned > 0 ? Math.round((metrics.completed / metrics.assigned) * 100) : 0;
          return (
            <motion.div key={user.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.05 }} onClick={() => setSelectedUser(user)} className={`bg-white border border-neutral-200 rounded-2xl p-6 hover:border-neutral-300 transition-all group cursor-pointer ${isManager ? "col-span-8" : "col-span-6"}`}>
              <div className="flex items-start gap-4 mb-6">
                <div className="relative flex-shrink-0">
                  <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center text-lg font-bold text-white">{user.avatar}</div>
                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center ${isManager ? "bg-violet-600" : "bg-neutral-900"}`}>
                    <RoleIcon className="w-3 h-3 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg mb-1 group-hover:text-violet-600 transition-colors">{user.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
                    <Mail className="w-3.5 h-3.5" />
                    <span className="truncate">{user.email}</span>
                  </div>
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${isManager ? "bg-violet-100 text-violet-700 border border-violet-200" : "bg-neutral-100 text-neutral-700 border border-neutral-200"}`}>
                    <RoleIcon className="w-3 h-3" />
                    {isManager ? "Manager" : "Developer"}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <Stat label="Assigned" value={metrics.assigned} className="bg-neutral-50 text-neutral-900 border-neutral-100" />
                <Stat label="In Progress" value={metrics.inProgress} className="bg-blue-50 text-blue-600 border-blue-100" />
                <Stat label="Completed" value={metrics.completed} className="bg-lime-50 text-lime-700 border-lime-200" />
              </div>
              <div className="pt-4 border-t border-neutral-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-sm text-neutral-600"><TrendingUp className="w-3.5 h-3.5" /><span className="font-medium">Completion Rate</span></div>
                  <span className="text-sm font-mono font-bold">{completionRate}%</span>
                </div>
                <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${completionRate}%` }} transition={{ duration: 0.8, delay: 0.3 + index * 0.1 }} className="h-full rounded-full bg-lime-500" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filteredUsers.length === 0 && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-neutral-50 border-2 border-dashed border-neutral-300 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-neutral-200 rounded-2xl flex items-center justify-center mx-auto mb-4"><Search className="w-8 h-8 text-neutral-400" /></div>
          <h3 className="text-xl font-semibold mb-2">No team members found</h3>
          <p className="text-neutral-600">Try adjusting your search</p>
        </motion.div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
          <form onSubmit={addMember} className="bg-white rounded-2xl border border-neutral-200 shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-2xl font-bold">Add Team Member</h2>
              <button type="button" onClick={() => setShowAdd(false)} className="p-2 hover:bg-neutral-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <Field label="Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} required />
            <Field label="Email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} required type="email" />
            <label className="block text-sm font-medium mt-3">
              Role
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })} className="mt-2 w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg">
                <option value="developer">Developer</option>
                <option value="manager">Manager</option>
              </select>
            </label>
            <button className="mt-6 w-full px-4 py-3 bg-black text-white rounded-lg hover:bg-neutral-800">Add Member</button>
          </form>
        </div>
      )}

      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-xl max-w-md w-full p-6">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h2 className="text-2xl font-bold">{selectedUser.name}</h2>
                <p className="text-sm text-neutral-500">{selectedUser.email}</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-neutral-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Info label="Role" value={selectedUser.role} />
              <Info label="Assigned Tickets" value={String(selectedUser.metrics?.assigned ?? 0)} />
              <Info label="In Progress" value={String(selectedUser.metrics?.inProgress ?? 0)} />
              <Info label="Completed" value={String(selectedUser.metrics?.completed ?? 0)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, required, type = "text" }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string }) {
  return (
    <label className="block text-sm font-medium mt-3">
      {label}
      <input required={required} type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-2 w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900" />
    </label>
  );
}

function Stat({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className={`p-3 rounded-lg border ${className}`}>
      <div className="text-2xl font-bold mb-0.5">{value}</div>
      <div className="text-xs text-neutral-500 font-medium">{label}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-neutral-50 border border-neutral-100 rounded-lg">
      <div className="text-xs text-neutral-500 mb-1">{label}</div>
      <div className="font-medium break-words capitalize">{value}</div>
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
