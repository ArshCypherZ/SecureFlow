import { FormEvent, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { VulnerabilityTicket } from "./VulnerabilityTicket";
import type { Severity, TicketStatus } from "../lib/mockData";
import { api, formatDate, Project, User, VulnerabilityTicket as Ticket } from "../lib/api";

export function KanbanBoard() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const columns: { id: TicketStatus; label: string }[] = [
    { id: "todo", label: "Backlog" },
    { id: "in-progress", label: "In Progress" },
    { id: "in-review", label: "Review" },
    { id: "done", label: "Resolved" },
  ];

  const loadBoard = async () => {
    try {
      setLoading(true);
      const [ticketList, userList, projectList] = await Promise.all([
        api.tickets(),
        api.users(),
        api.projects(),
      ]);
      setTickets(ticketList);
      setUsers(userList);
      setProjects(projectList);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load board");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBoard();
  }, []);

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.package.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.osvId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = filterSeverity === "all" || ticket.severity === filterSeverity;
    return matchesSearch && matchesSeverity;
  });

  const getTicketsByStatus = (status: TicketStatus) => {
    return filteredTickets.filter((ticket) => ticket.status === status);
  };

  const updateTicketInState = (updated: Ticket) => {
    setTickets((current) => current.map((ticket) => (ticket.id === updated.id ? updated : ticket)));
    setSelectedTicket((current) => (current?.id === updated.id ? updated : current));
    setMessage(`Updated ${updated.osvId}`);
  };

  return (
    <div className="p-8 h-screen flex flex-col">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-5xl font-bold tracking-tight mb-2 font-serif italic">
              Kanban Board
            </h1>
            <p className="text-lg text-neutral-600">
              Track and manage vulnerability remediation workflow
            </p>
          </div>
          <button
            onClick={() => setShowNewTicket(true)}
            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-neutral-800 transition-colors font-medium flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Ticket
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search vulnerabilities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-neutral-400" />
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="px-3 py-2.5 bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 transition-all text-sm cursor-pointer appearance-none pr-8"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23737373'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 0.5rem center",
                backgroundSize: "1.25rem",
              }}
            >
              <option value="all">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div className="px-3 py-2.5 bg-neutral-100 border border-neutral-200 rounded-lg">
            <span className="text-sm font-mono font-semibold text-neutral-900">
              {filteredTickets.length}
            </span>
            <span className="text-sm text-neutral-500 ml-1">items</span>
          </div>
        </div>
        {message && (
          <div className="mt-4 bg-white border border-neutral-200 rounded-lg px-4 py-3 text-sm text-neutral-700 flex items-center justify-between">
            <span>{message}</span>
            <button onClick={() => setMessage("")} className="text-neutral-400 hover:text-neutral-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Kanban Columns */}
      <div className="flex-1 grid grid-cols-4 gap-4 overflow-hidden">
        {loading && (
          <div className="col-span-4 bg-white border border-neutral-200 rounded-2xl p-8 text-center text-neutral-500">
            Loading tickets from backend...
          </div>
        )}
        {!loading && columns.map((column) => {
          const columnTickets = getTicketsByStatus(column.id);

          return (
            <div key={column.id} className="flex flex-col h-full">
              {/* Column Header */}
              <div className="mb-4">
                <div className="bg-white border border-neutral-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-neutral-900 mb-0.5">
                        {column.label}
                      </h3>
                      <p className="text-xs text-neutral-500">
                        {columnTickets.length} {columnTickets.length === 1 ? "item" : "items"}
                      </p>
                    </div>
                    <div className="w-8 h-8 bg-neutral-100 rounded-lg flex items-center justify-center font-mono font-bold text-sm">
                      {columnTickets.length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Column Content */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                <AnimatePresence mode="popLayout">
                  {columnTickets.map((ticket) => (
                    <VulnerabilityTicket
                      key={ticket.id}
                      ticket={ticket}
                      users={users}
                      onOpen={setSelectedTicket}
                      onTicketUpdated={updateTicketInState}
                      onError={setMessage}
                    />
                  ))}
                </AnimatePresence>

                {columnTickets.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-neutral-50 border border-dashed border-neutral-300 rounded-xl p-6 text-center"
                  >
                    <p className="text-sm text-neutral-400">No items</p>
                  </motion.div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {selectedTicket && (
        <TicketDetails
          ticket={selectedTicket}
          users={users}
          onClose={() => setSelectedTicket(null)}
          onUpdated={updateTicketInState}
          onError={setMessage}
        />
      )}
      {showNewTicket && (
        <NewTicketDialog
          projects={projects}
          users={users}
          onClose={() => setShowNewTicket(false)}
          onCreated={(ticket) => {
            setTickets((current) => [ticket, ...current]);
            setShowNewTicket(false);
            setMessage(`Created ${ticket.osvId}`);
          }}
          onError={setMessage}
        />
      )}
    </div>
  );
}

function TicketDetails({
  ticket,
  users,
  onClose,
  onUpdated,
  onError,
}: {
  ticket: Ticket;
  users: User[];
  onClose: () => void;
  onUpdated: (ticket: Ticket) => void;
  onError: (message: string) => void;
}) {
  const update = async (payload: { status?: TicketStatus; assigneeId?: string | null }) => {
    try {
      onUpdated(await api.updateTicket(ticket.id, payload));
    } catch (error) {
      onError(error instanceof Error ? error.message : "Unable to update ticket");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <div className="text-xs font-mono text-neutral-500 mb-2">{ticket.osvId}</div>
            <h2 className="text-2xl font-bold">{ticket.summary}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-neutral-700 leading-relaxed mb-5">{ticket.description}</p>
        <div className="grid grid-cols-2 gap-3 mb-5">
          <Info label="Severity" value={ticket.severity} />
          <Info label="CVSS" value={String(ticket.cvssScore)} />
          <Info label="Package" value={`${ticket.package}@${ticket.currentVersion}`} />
          <Info label="Fixed Version" value={ticket.fixedVersion ? `v${ticket.fixedVersion}` : "Not available"} />
          <Info label="Created" value={formatDate(ticket.createdAt)} />
          <Info label="Updated" value={formatDate(ticket.updatedAt)} />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-5">
          <label className="text-sm font-medium">
            Status
            <select
              value={ticket.status}
              onChange={(e) => update({ status: e.target.value as TicketStatus })}
              className="mt-2 w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg"
            >
              <option value="todo">Backlog</option>
              <option value="in-progress">In Progress</option>
              <option value="in-review">Review</option>
              <option value="done">Resolved</option>
            </select>
          </label>
          <label className="text-sm font-medium">
            Assignee
            <select
              value={ticket.assigneeId ?? ""}
              onChange={(e) => update({ assigneeId: e.target.value || null })}
              className="mt-2 w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg"
            >
              <option value="">Unassigned</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
          </label>
        </div>
        {ticket.references.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2">References</h3>
            <div className="space-y-2">
              {ticket.references.map((reference) => (
                <a key={reference} href={reference} target="_blank" rel="noreferrer" className="block text-sm text-violet-700 hover:text-violet-900 break-all">
                  {reference}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NewTicketDialog({
  projects,
  users,
  onClose,
  onCreated,
  onError,
}: {
  projects: Project[];
  users: User[];
  onClose: () => void;
  onCreated: (ticket: Ticket) => void;
  onError: (message: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    projectId: projects[0]?.id ?? "",
    osvId: "",
    summary: "",
    description: "",
    severity: "HIGH" as Severity,
    package: "",
    ecosystem: "npm",
    currentVersion: "",
    fixedVersion: "",
    cvssScore: "7.0",
    assigneeId: "",
    status: "todo" as TicketStatus,
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setSaving(true);
      const created = await api.createTicket({
        ...form,
        fixedVersion: form.fixedVersion || null,
        cvssScore: Number(form.cvssScore),
        assigneeId: form.assigneeId || null,
      });
      onCreated(created);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Unable to create ticket");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
      <form onSubmit={submit} className="bg-white rounded-2xl border border-neutral-200 shadow-xl max-w-2xl w-full p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-bold">Create Vulnerability Ticket</h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="OSV ID" value={form.osvId} onChange={(v) => setForm({ ...form, osvId: v })} required />
          <Field label="Package" value={form.package} onChange={(v) => setForm({ ...form, package: v })} required />
          <Field label="Summary" value={form.summary} onChange={(v) => setForm({ ...form, summary: v })} required className="col-span-2" />
          <Field label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} required className="col-span-2" />
          <label className="text-sm font-medium">
            Project
            <select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} className="mt-2 w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg">
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium">
            Severity
            <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value as Severity })} className="mt-2 w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg">
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </label>
          <Field label="Ecosystem" value={form.ecosystem} onChange={(v) => setForm({ ...form, ecosystem: v })} required />
          <Field label="Current Version" value={form.currentVersion} onChange={(v) => setForm({ ...form, currentVersion: v })} required />
          <Field label="Fixed Version" value={form.fixedVersion} onChange={(v) => setForm({ ...form, fixedVersion: v })} />
          <Field label="CVSS Score" value={form.cvssScore} onChange={(v) => setForm({ ...form, cvssScore: v })} type="number" />
          <label className="text-sm font-medium">
            Assignee
            <select value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })} className="mt-2 w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg">
              <option value="">Unassigned</option>
              {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium">
            Status
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as TicketStatus })} className="mt-2 w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg">
              <option value="todo">Backlog</option>
              <option value="in-progress">In Progress</option>
              <option value="in-review">Review</option>
              <option value="done">Resolved</option>
            </select>
          </label>
        </div>
        <button disabled={saving || !form.projectId} className="mt-6 w-full px-4 py-3 bg-black text-white rounded-lg hover:bg-neutral-800 disabled:opacity-50">
          {saving ? "Creating..." : "Create Ticket"}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  className?: string;
}) {
  return (
    <label className={`text-sm font-medium ${className}`}>
      {label}
      <input
        required={required}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
      />
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-neutral-50 border border-neutral-100 rounded-lg">
      <div className="text-xs text-neutral-500 mb-1">{label}</div>
      <div className="font-medium break-words">{value}</div>
    </div>
  );
}
