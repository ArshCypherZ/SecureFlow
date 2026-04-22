import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  ShieldAlert,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { MarkdownContent } from "./MarkdownContent";
import {
  api,
  formatDate,
  type DashboardSummary,
  type Project,
  type VulnerabilityTicket,
} from "../lib/api";

export function DashboardIntegrated({
  onViewChange,
}: {
  onViewChange: (view: string) => void;
}) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [tickets, setTickets] = useState<VulnerabilityTicket[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<VulnerabilityTicket | null>(null);
  const [showCritical, setShowCritical] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [nextSummary, nextTickets, nextProjects] = await Promise.all([
          api.summary(),
          api.tickets(),
          api.projects(),
        ]);
        setSummary(nextSummary);
        setTickets(nextTickets);
        setProjects(nextProjects);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to load dashboard");
      }
    };
    void loadDashboard();
  }, []);

  const criticalTickets = tickets.filter((ticket) => ticket.severity === "CRITICAL");
  const recentTickets = [...tickets]
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, 5);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-neutral-500">
              Overview
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
              Security posture
            </h1>
            <p className="mt-3 max-w-2xl text-base text-neutral-600">
              Live snapshot of project scans, open findings, and remediation progress across the
              workspace.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-neutral-200 bg-white px-5 py-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
              Workspace
            </p>
            <p className="mt-2 text-sm text-neutral-600">
              Projects: <span className="font-semibold text-neutral-950">{projects.length}</span>
            </p>
            <p className="mt-1 text-sm text-neutral-600">
              Last scan:{" "}
              <span className="font-semibold text-neutral-950">
                {formatDate(projects[0]?.lastScan ?? null)}
              </span>
            </p>
          </div>
        </div>

        {message ? <Notice message={message} onClose={() => setMessage("")} /> : null}
      </div>

      {projects.length === 0 ? (
        <div className="rounded-[2rem] border-2 border-dashed border-neutral-300 bg-neutral-50 px-6 py-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm">
            <ShieldAlert className="h-7 w-7 text-neutral-400" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold text-neutral-950">Start with a repository</h2>
          <p className="mx-auto mt-3 max-w-xl text-neutral-600">
            Add a GitHub project to kick off scanning. Once findings arrive, the board and activity
            stream will populate automatically.
          </p>
          <button
            type="button"
            onClick={() => onViewChange("projects")}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            Open Projects
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[2rem] border border-red-200 bg-red-50 p-8"
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                <AlertTriangle className="h-3.5 w-3.5" />
                Critical findings
              </div>
              <div className="mt-5">
                <div className="text-6xl font-semibold tracking-tight text-neutral-950">
                  {summary?.totals.critical ?? 0}
                </div>
                <p className="mt-3 max-w-lg text-neutral-700">
                  High-risk vulnerabilities that should be triaged first.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCritical(true)}
                className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Review critical tickets
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </motion.div>

            <div className="grid gap-4 sm:grid-cols-2">
              <MetricCard
                label="Total findings"
                value={summary?.totals.vulnerabilities ?? 0}
                icon={<Activity className="h-5 w-5 text-neutral-700" />}
              />
              <MetricCard
                label="Resolved"
                value={summary?.totals.resolved ?? 0}
                icon={<CheckCircle2 className="h-5 w-5 text-lime-700" />}
              />
              <MetricCard
                label="In progress"
                value={
                  (summary?.byStatus["in-progress"] ?? 0) +
                  (summary?.byStatus["in-review"] ?? 0)
                }
                icon={<Clock className="h-5 w-5 text-amber-700" />}
              />
              <MetricCard
                label="Open"
                value={summary?.totals.open ?? 0}
                icon={<ShieldAlert className="h-5 w-5 text-blue-700" />}
              />
            </div>
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_0.95fr]">
            <section className="rounded-[2rem] border border-neutral-200 bg-white p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-neutral-950">
                    Recent ticket activity
                  </h2>
                  <p className="mt-2 text-sm text-neutral-600">
                    Most recently updated findings from the board.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onViewChange("kanban")}
                  className="text-sm font-semibold text-neutral-700 transition hover:text-neutral-950"
                >
                  Open board
                </button>
              </div>

              <div className="mt-6 space-y-3">
                {recentTickets.map((ticket, index) => (
                  <motion.button
                    key={ticket.id}
                    type="button"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.24, delay: 0.04 * index }}
                    onClick={() => setSelectedTicket(ticket)}
                    className="w-full rounded-[1.4rem] border border-neutral-200 bg-white px-5 py-4 text-left transition hover:border-neutral-300"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`mt-1 h-2.5 w-2.5 rounded-full ${severityDot(ticket.severity)}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-neutral-950">{ticket.summary}</h3>
                            <p className="mt-1 text-sm text-neutral-500">
                              <span className="font-mono">{ticket.package}</span>
                              <span className="px-2">•</span>
                              <span className="font-mono">{ticket.osvId}</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${severityBadge(ticket.severity)}`}>
                              {ticket.severity}
                            </span>
                            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700">
                              {ticket.status}
                            </span>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-neutral-600">
                          <span>CVSS {ticket.cvssScore}</span>
                          <span className="text-neutral-300">•</span>
                          <span>Updated {formatDate(ticket.updatedAt)}</span>
                          {ticket.assignee ? (
                            <>
                              <span className="text-neutral-300">•</span>
                              <span className="inline-flex items-center gap-2">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-950 text-[10px] font-semibold text-white">
                                  {ticket.assignee.avatar}
                                </span>
                                {ticket.assignee.name}
                              </span>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </section>

            <section className="rounded-[2rem] border border-neutral-200 bg-white p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-neutral-950">
                    Project health
                  </h2>
                  <p className="mt-2 text-sm text-neutral-600">
                    Scan coverage and vulnerability counts per repository.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onViewChange("projects")}
                  className="text-sm font-semibold text-neutral-700 transition hover:text-neutral-950"
                >
                  Manage projects
                </button>
              </div>

              <div className="mt-6 space-y-3">
                {projects.map((project, index) => (
                  <motion.button
                    key={project.id}
                    type="button"
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.24, delay: 0.05 * index }}
                    onClick={() => onViewChange("projects")}
                    className="w-full rounded-[1.4rem] border border-neutral-200 bg-neutral-50 px-5 py-4 text-left transition hover:border-neutral-300"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold tracking-tight text-neutral-950">
                          {project.name}
                        </h3>
                        <p className="mt-1 truncate font-mono text-xs text-neutral-500">
                          {project.repository}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${projectStatus(project.scanStatus)}`}>
                        {project.scanStatus}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-4 gap-2">
                      <ProjectCount label="Critical" value={project.criticalCount} className="bg-red-50 border-red-100 text-red-700" />
                      <ProjectCount label="High" value={project.highCount} className="bg-orange-50 border-orange-100 text-orange-700" />
                      <ProjectCount label="Medium" value={project.mediumCount} className="bg-yellow-50 border-yellow-100 text-yellow-700" />
                      <ProjectCount label="Low" value={project.lowCount} className="bg-green-50 border-green-100 text-green-700" />
                    </div>
                    <div className="mt-4 flex items-center justify-between text-sm text-neutral-600">
                      <span>Last scan {formatDate(project.lastScan)}</span>
                      <span className="font-semibold text-neutral-950">
                        {project.totalVulnerabilities} total
                      </span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </section>
          </div>
        </>
      )}

      {showCritical ? (
        <Modal onClose={() => setShowCritical(false)} title="Critical vulnerabilities">
          <div className="space-y-3">
            {criticalTickets.length > 0 ? (
              criticalTickets.map((ticket) => (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => {
                    setShowCritical(false);
                    setSelectedTicket(ticket);
                  }}
                  className="w-full rounded-2xl border border-red-100 bg-red-50 px-4 py-4 text-left transition hover:border-red-300"
                >
                  <div className="font-semibold text-neutral-950">{ticket.summary}</div>
                  <div className="mt-1 text-xs font-mono text-neutral-500">
                    {ticket.osvId} · CVSS {ticket.cvssScore}
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 text-sm text-neutral-600">
                No critical vulnerabilities are open right now.
              </div>
            )}
          </div>
        </Modal>
      ) : null}

      {selectedTicket ? (
        <Modal onClose={() => setSelectedTicket(null)} title={selectedTicket.summary}>
          <div className="text-xs font-mono text-neutral-500">{selectedTicket.osvId}</div>
          <MarkdownContent content={selectedTicket.description} className="mt-4" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Info label="Severity" value={selectedTicket.severity} />
            <Info label="Status" value={selectedTicket.status} />
            <Info
              label="Package"
              value={`${selectedTicket.package}@${selectedTicket.currentVersion}`}
            />
            <Info
              label="Fixed version"
              value={selectedTicket.fixedVersion ? `v${selectedTicket.fixedVersion}` : "Not available"}
            />
          </div>
          <button
            type="button"
            onClick={() => onViewChange("kanban")}
            className="mt-6 w-full rounded-2xl bg-neutral-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            Open in board
          </button>
        </Modal>
      ) : null}
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[1.7rem] border border-neutral-200 bg-white p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-neutral-500">{label}</p>
          <div className="mt-2 text-4xl font-semibold tracking-tight text-neutral-950">
            {value}
          </div>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-100">
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

function ProjectCount({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div className={`rounded-2xl border px-3 py-3 text-center ${className}`}>
      <div className="text-xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-neutral-500">
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
      <div className="mt-2 text-sm font-semibold text-neutral-950">{value}</div>
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 sm:p-6">
      <div className="w-full max-w-2xl rounded-[1.8rem] border border-neutral-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-tight text-neutral-950">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-950"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
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

function severityDot(severity: string) {
  if (severity === "CRITICAL") return "bg-red-500";
  if (severity === "HIGH") return "bg-orange-500";
  if (severity === "MEDIUM") return "bg-yellow-500";
  return "bg-green-500";
}

function severityBadge(severity: string) {
  if (severity === "CRITICAL") return "bg-red-100 text-red-700";
  if (severity === "HIGH") return "bg-orange-100 text-orange-700";
  if (severity === "MEDIUM") return "bg-yellow-100 text-yellow-700";
  return "bg-green-100 text-green-700";
}

function projectStatus(status: Project["scanStatus"]) {
  if (status === "error") return "bg-red-50 text-red-700";
  if (status === "ready") return "bg-lime-50 text-lime-800";
  if (status === "scanning") return "bg-blue-50 text-blue-700";
  if (status === "queued") return "bg-amber-50 text-amber-700";
  return "bg-neutral-100 text-neutral-700";
}
