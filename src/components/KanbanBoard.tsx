import { FormEvent, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { VulnerabilityTicket } from "./VulnerabilityTicket";
import { MarkdownContent } from "./MarkdownContent";
import {
  api,
  formatDate,
  type Project,
  type Severity,
  type TicketStatus,
  type User,
  type VulnerabilityTicket as Ticket,
} from "../lib/api";
import { sanitizeSingleLineInput } from "../lib/validators";

const selectChevronStyle = {
  backgroundImage:
    'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23737373\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")',
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 0.5rem center",
  backgroundSize: "1.25rem",
} as const;

export function KanbanBoard({ currentUser }: { currentUser: User | null }) {
  const isManager = currentUser?.role === "manager";
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterProjectId, setFilterProjectId] = useState("all");
  const [filterAssigneeId, setFilterAssigneeId] = useState("all");
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

  const usersById = new Map(users.map((user) => [user.id, user]));
  const developers = users.filter((user) => user.role === "developer");
  const projectsById = new Map(projects.map((project) => [project.id, project]));
  const searchValue = searchTerm.trim().toLowerCase();

  const filteredTickets = tickets.filter((ticket) => {
    const assignee = ticket.assignee ?? (ticket.assigneeId ? usersById.get(ticket.assigneeId) ?? null : null);
    const project = projectsById.get(ticket.projectId);
    const matchesSearch =
      !searchValue ||
      [
        ticket.summary,
        ticket.description,
        ticket.package,
        ticket.osvId,
        ticket.ecosystem,
        ticket.severity,
        ticket.status,
        project?.name ?? "",
        project?.repository ?? "",
        assignee?.name ?? "",
        assignee?.username ?? "",
      ].some((value) => value.toLowerCase().includes(searchValue));
    const matchesSeverity = filterSeverity === "all" || ticket.severity === filterSeverity;
    const matchesProject = filterProjectId === "all" || ticket.projectId === filterProjectId;
    const matchesAssignee =
      filterAssigneeId === "all" ||
      (filterAssigneeId === "unassigned" ? !ticket.assigneeId : ticket.assigneeId === filterAssigneeId);

    return matchesSearch && matchesSeverity && matchesProject && matchesAssignee;
  });

  const hasActiveFilters =
    searchValue.length > 0 ||
    filterSeverity !== "all" ||
    filterProjectId !== "all" ||
    filterAssigneeId !== "all";

  const getTicketsByStatus = (status: TicketStatus) => {
    return filteredTickets.filter((ticket) => ticket.status === status);
  };

  const updateTicketInState = (updated: Ticket) => {
    setTickets((current) => current.map((ticket) => (ticket.id === updated.id ? updated : ticket)));
    setSelectedTicket((current) => (current?.id === updated.id ? updated : current));
    setMessage(`Updated ${updated.osvId}`);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
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
            disabled={!isManager}
            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-neutral-800 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            New Ticket
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search tickets, projects, packages, or developers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all text-sm"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-neutral-400" />
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="px-3 py-2.5 bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 transition-all text-sm cursor-pointer appearance-none pr-8"
                  style={selectChevronStyle}
                >
                  <option value="all">All Severities</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>

              <select
                value={filterProjectId}
                onChange={(e) => setFilterProjectId(e.target.value)}
                className="px-3 py-2.5 bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 transition-all text-sm cursor-pointer appearance-none pr-8"
                style={selectChevronStyle}
              >
                <option value="all">All Projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>

              <select
                value={filterAssigneeId}
                onChange={(e) => setFilterAssigneeId(e.target.value)}
                className="px-3 py-2.5 bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 transition-all text-sm cursor-pointer appearance-none pr-8"
                style={selectChevronStyle}
              >
                <option value="all">All Developers</option>
                <option value="unassigned">Unassigned</option>
                {developers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>

              <div className="px-3 py-2.5 bg-neutral-100 border border-neutral-200 rounded-lg">
                <span className="text-sm font-mono font-semibold text-neutral-900">
                  {filteredTickets.length}
                </span>
                <span className="text-sm text-neutral-500 ml-1">
                  {filteredTickets.length === tickets.length ? "tickets" : `of ${tickets.length}`}
                </span>
              </div>

              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setFilterSeverity("all");
                    setFilterProjectId("all");
                    setFilterAssigneeId("all");
                  }}
                  className="px-3 py-2.5 bg-white border border-neutral-200 rounded-lg text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>

          <div className="text-xs text-neutral-500">
            Search also matches project name, repository, assignee name, severity, and package details.
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
      <div
        className="grid gap-4"
        style={{ alignItems: "start", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}
      >
        {loading && (
          <div className="bg-white border border-neutral-200 rounded-2xl p-8 text-center text-neutral-500">
            Loading tickets from backend...
          </div>
        )}
        {!loading && columns.map((column) => {
          const columnTickets = getTicketsByStatus(column.id);

          return (
            <div key={column.id} className="flex flex-col">
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
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {columnTickets.map((ticket) => (
                    <VulnerabilityTicket
                      key={ticket.id}
                      ticket={ticket}
                      users={users}
                      currentUser={currentUser}
                      canAssign={isManager}
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
          currentUser={currentUser}
          canAssign={isManager}
          onClose={() => setSelectedTicket(null)}
          onUpdated={updateTicketInState}
          onDeleted={(ticketId) => {
            setTickets((current) => current.filter((ticket) => ticket.id !== ticketId));
            setSelectedTicket(null);
            setMessage("Ticket removed.");
          }}
          onError={setMessage}
        />
      )}
      {showNewTicket && isManager && (
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
  currentUser,
  canAssign,
  onClose,
  onUpdated,
  onDeleted,
  onError,
}: {
  ticket: Ticket;
  users: User[];
  currentUser: User | null;
  canAssign: boolean;
  onClose: () => void;
  onUpdated: (ticket: Ticket) => void;
  onDeleted: (ticketId: string) => void;
  onError: (message: string) => void;
}) {
  const canUpdateStatus = canAssign || ticket.assigneeId === currentUser?.id;
  const [deleting, setDeleting] = useState(false);

  const update = async (payload: { status?: TicketStatus; assigneeId?: string | null }) => {
    try {
      onUpdated(await api.updateTicket(ticket.id, payload));
    } catch (error) {
      onError(error instanceof Error ? error.message : "Unable to update ticket");
    }
  };

  const remove = async () => {
    if (!canAssign) return;
    const confirmed = window.confirm(
      `Delete ${ticket.osvId}? This removes the ticket from the board.`
    );
    if (!confirmed) return;

    try {
      setDeleting(true);
      await api.deleteTicket(ticket.id);
      onDeleted(ticket.id);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Unable to delete ticket");
    } finally {
      setDeleting(false);
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
        <MarkdownContent content={ticket.description} className="mb-5" />
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
              disabled={!canUpdateStatus}
              onChange={(e) => update({ status: e.target.value as TicketStatus })}
              className="mt-2 w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
              disabled={!canAssign}
              onChange={(e) => update({ assigneeId: e.target.value || null })}
              className="mt-2 w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Unassigned</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
          </label>
        </div>
        {!canUpdateStatus ? (
          <p className="mb-5 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
            Only the assigned developer or a manager can move this ticket.
          </p>
        ) : null}
        {canAssign ? (
          <button
            type="button"
            onClick={() => void remove()}
            disabled={deleting}
            className="mb-5 w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:border-red-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting ? "Removing..." : "Delete ticket"}
          </button>
        ) : null}
        {ticket.references.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2">References</h3>
            <div className="space-y-2">
              {ticket.references.map((reference) => (
                <a
                  key={reference}
                  href={reference}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-sm text-neutral-800 underline decoration-neutral-300 underline-offset-3 hover:decoration-neutral-900 break-all"
                >
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
    const sanitizedOsvId = sanitizeSingleLineInput(form.osvId, 120);
    const sanitizedPackage = sanitizeSingleLineInput(form.package, 150);
    const sanitizedSummary = sanitizeSingleLineInput(form.summary, 200);
    const sanitizedDescription = form.description.trim();
    const sanitizedEcosystem = sanitizeSingleLineInput(form.ecosystem, 80);
    const sanitizedCurrentVersion = sanitizeSingleLineInput(form.currentVersion, 120);
    const sanitizedFixedVersion = sanitizeSingleLineInput(form.fixedVersion, 120);
    const cvssScore = Number(form.cvssScore);

    if (
      !form.projectId ||
      !sanitizedOsvId ||
      !sanitizedPackage ||
      !sanitizedSummary ||
      !sanitizedDescription ||
      !sanitizedEcosystem ||
      !sanitizedCurrentVersion
    ) {
      onError("Fill in all required ticket fields before creating a manual ticket.");
      return;
    }
    if (!Number.isFinite(cvssScore) || cvssScore < 0 || cvssScore > 10) {
      onError("CVSS score must be a number between 0 and 10.");
      return;
    }

    try {
      setSaving(true);
      const created = await api.createTicket({
        ...form,
        osvId: sanitizedOsvId,
        package: sanitizedPackage,
        summary: sanitizedSummary,
        description: sanitizedDescription,
        ecosystem: sanitizedEcosystem,
        currentVersion: sanitizedCurrentVersion,
        fixedVersion: sanitizedFixedVersion || null,
        cvssScore,
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
        {projects.length === 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Add a project first so tickets can be linked to a repository scan workflow.
          </div>
        ) : null}
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
