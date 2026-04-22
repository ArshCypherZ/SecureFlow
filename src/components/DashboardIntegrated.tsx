import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, TrendingDown, ArrowUpRight, Clock, Activity, CheckCircle2, X } from "lucide-react";
import { motion } from "motion/react";
import { api, DashboardSummary, formatDate, Project, VulnerabilityTicket } from "../lib/api";

export function DashboardIntegrated({ onViewChange }: { onViewChange: (view: string) => void }) {
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

  const totalVulns = summary?.totals.vulnerabilities ?? 0;
  const criticalCount = summary?.totals.critical ?? 0;
  const highCount = summary?.totals.high ?? 0;
  const resolvedCount = summary?.totals.resolved ?? 0;
  const inProgressCount = (summary?.byStatus["in-progress"] ?? 0) + (summary?.byStatus["in-review"] ?? 0);
  const recentVulns = [...tickets]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);
  const criticalTickets = tickets.filter((ticket) => ticket.severity === "CRITICAL");

  return (
    <div className="p-8 pb-20">
      <div className="mb-12">
        <div className="flex items-start justify-between">
          <div className="max-w-2xl">
            <h1 className="text-5xl font-bold tracking-tight mb-3 font-serif italic">
              Security Overview
            </h1>
            <p className="text-lg text-neutral-600">
              Real-time vulnerability tracking across{" "}
              <span className="font-semibold text-neutral-900">{projects.length} repositories</span>
            </p>
          </div>
          <div className="text-right">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-neutral-200 rounded-full text-sm mb-2">
              <div className="w-2 h-2 bg-lime-400 rounded-full animate-pulse" />
              <span className="text-neutral-600">Live</span>
            </div>
            <p className="text-xs text-neutral-500">Last scan: {formatDate(projects[0]?.lastScan ?? null)}</p>
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

      <div className="grid grid-cols-12 gap-4 mb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="col-span-5 row-span-2 bg-red-50 border-2 border-red-200 rounded-2xl p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-100 rounded-full -mr-16 -mt-16" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 border border-red-200 rounded-full text-xs font-semibold text-red-700 mb-4">
              <AlertTriangle className="w-3 h-3" />
              CRITICAL
            </div>
            <div className="mb-6">
              <div className="text-6xl font-bold mb-2">{criticalCount}</div>
              <p className="text-neutral-700 text-lg">Critical vulnerabilities requiring immediate attention</p>
            </div>
            <button onClick={() => setShowCritical(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium">
              View Details
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>

        <MetricCard delay={0.2} label="Total Vulnerabilities" value={totalVulns} icon={<Activity className="w-5 h-5 text-neutral-600" />}>
          <div className="flex items-center gap-2 text-sm">
            <TrendingDown className="w-4 h-4 text-green-600" />
            <span className="text-green-600 font-semibold">Live</span>
            <span className="text-neutral-500">from backend</span>
          </div>
        </MetricCard>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="col-span-3 bg-lime-400 border-2 border-lime-500 rounded-2xl p-6">
          <CheckCircle2 className="w-8 h-8 mb-3" />
          <div className="text-3xl font-bold mb-1">{resolvedCount}</div>
          <p className="text-sm font-medium">Resolved</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="col-span-4 bg-white border border-neutral-200 rounded-2xl p-6 dot-pattern-dense">
          <div className="relative bg-white/80 backdrop-blur-sm p-4 rounded-lg">
            <p className="text-sm text-neutral-500 mb-1">High Priority</p>
            <div className="text-4xl font-bold mb-2">{highCount}</div>
            <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full" style={{ width: `${totalVulns ? (highCount / totalVulns) * 100 : 0}%` }} />
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="col-span-3 bg-violet-600 text-white rounded-2xl p-6">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mb-3">
            <Clock className="w-5 h-5" />
          </div>
          <div className="text-3xl font-bold mb-1">{inProgressCount}</div>
          <p className="text-sm text-violet-100">In Progress</p>
        </motion.div>
      </div>

      <div className="mb-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold font-serif italic mb-1">Recent Activity</h2>
            <p className="text-neutral-600">Latest vulnerability updates</p>
          </div>
          <button onClick={() => onViewChange("kanban")} className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors">
            View all →
          </button>
        </div>

        <div className="space-y-3">
          {recentVulns.map((vuln, index) => (
            <motion.div key={vuln.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + index * 0.05 }} onClick={() => setSelectedTicket(vuln)} className="bg-white border border-neutral-200 rounded-xl p-5 hover:border-neutral-300 transition-all cursor-pointer group">
              <div className="flex items-start gap-4">
                <div className={`mt-1.5 w-2 h-2 rounded-full ${severityDot(vuln.severity)}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <h3 className="font-semibold text-neutral-900 mb-1 group-hover:text-violet-600 transition-colors">{vuln.summary}</h3>
                      <div className="flex items-center gap-3 text-sm text-neutral-500">
                        <span className="font-mono text-xs">{vuln.package}</span>
                        <span>•</span>
                        <span className="font-mono text-xs">{vuln.osvId}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${severityBadge(vuln.severity)}`}>{vuln.severity}</div>
                      <p className="text-xs text-neutral-400 mt-1">CVSS {vuln.cvssScore}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {vuln.assignee && (
                      <div className="flex items-center gap-2 text-sm text-neutral-600">
                        <div className="w-5 h-5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center text-[10px] font-semibold text-white">{vuln.assignee.avatar}</div>
                        <span>{vuln.assignee.name}</span>
                      </div>
                    )}
                    <div className="px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-800">{vuln.status}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-3xl font-bold font-serif italic mb-6">Active Projects</h2>
        <div className="grid grid-cols-2 gap-4">
          {projects.map((project, index) => (
            <motion.div key={project.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 + index * 0.1 }} onClick={() => onViewChange("projects")} className={`bg-white border border-neutral-200 rounded-2xl p-6 hover:border-neutral-300 transition-all cursor-pointer group ${index === 0 ? "border-2 border-neutral-900" : ""}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1 group-hover:text-violet-600 transition-colors">{project.name}</h3>
                  <p className="text-sm text-neutral-500 font-mono">{project.repository}</p>
                </div>
                {index === 0 && <div className="px-2 py-1 bg-lime-400 text-xs font-bold rounded">MAIN</div>}
              </div>
              <div className="grid grid-cols-4 gap-2 mb-4">
                <ProjectCount label="Critical" value={project.criticalCount} className="bg-red-50 border-red-100 text-red-600" />
                <ProjectCount label="High" value={project.highCount} className="bg-orange-50 border-orange-100 text-orange-600" />
                <ProjectCount label="Medium" value={project.mediumCount} className="bg-yellow-50 border-yellow-100 text-yellow-600" />
                <ProjectCount label="Low" value={project.lowCount} className="bg-green-50 border-green-100 text-green-600" />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500">Last scan: {formatDate(project.lastScan)}</span>
                <span className="font-mono font-semibold">{project.totalVulnerabilities} total</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {showCritical && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-2xl font-bold">Critical Vulnerabilities</h2>
              <button onClick={() => setShowCritical(false)} className="p-2 hover:bg-neutral-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {criticalTickets.map((ticket) => (
                <button key={ticket.id} onClick={() => { setShowCritical(false); setSelectedTicket(ticket); }} className="w-full text-left p-4 bg-red-50 border border-red-100 rounded-xl hover:border-red-300">
                  <div className="font-semibold">{ticket.summary}</div>
                  <div className="text-xs text-neutral-500 font-mono mt-1">{ticket.osvId} · CVSS {ticket.cvssScore}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-xl max-w-2xl w-full p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="text-xs font-mono text-neutral-500 mb-2">{selectedTicket.osvId}</div>
                <h2 className="text-2xl font-bold">{selectedTicket.summary}</h2>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="p-2 hover:bg-neutral-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-neutral-700 mb-5">{selectedTicket.description}</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Info label="Severity" value={selectedTicket.severity} />
              <Info label="Status" value={selectedTicket.status} />
              <Info label="Package" value={`${selectedTicket.package}@${selectedTicket.currentVersion}`} />
              <Info label="Fixed Version" value={selectedTicket.fixedVersion ? `v${selectedTicket.fixedVersion}` : "Not available"} />
            </div>
            <button onClick={() => onViewChange("kanban")} className="mt-6 w-full px-4 py-3 bg-black text-white rounded-lg hover:bg-neutral-800">Open in Kanban</button>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ delay, label, value, icon, children }: { delay: number; label: string; value: number; icon: ReactNode; children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="col-span-4 bg-white border border-neutral-200 rounded-2xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm text-neutral-500 mb-1">{label}</p>
          <div className="text-4xl font-bold">{value}</div>
        </div>
        <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center">{icon}</div>
      </div>
      {children}
    </motion.div>
  );
}

function ProjectCount({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className={`text-center p-2 rounded-lg border ${className}`}>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-[10px] text-neutral-500 uppercase tracking-wide">{label}</div>
    </div>
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

function severityDot(severity: string) {
  if (severity === "CRITICAL") return "bg-red-500";
  if (severity === "HIGH") return "bg-orange-500";
  if (severity === "MEDIUM") return "bg-yellow-500";
  return "bg-green-500";
}

function severityBadge(severity: string) {
  if (severity === "CRITICAL") return "bg-red-100 text-red-700 border border-red-200";
  if (severity === "HIGH") return "bg-orange-100 text-orange-700 border border-orange-200";
  if (severity === "MEDIUM") return "bg-yellow-100 text-yellow-700 border border-yellow-200";
  return "bg-green-100 text-green-700 border border-green-200";
}
