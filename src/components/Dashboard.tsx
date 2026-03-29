import { AlertTriangle, TrendingDown, ArrowUpRight, Clock, Activity, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";
import { mockVulnerabilities, mockProjects } from "../lib/mockData";

export function Dashboard() {
  const totalVulns = mockVulnerabilities.length;
  const criticalCount = mockVulnerabilities.filter(v => v.severity === "CRITICAL").length;
  const highCount = mockVulnerabilities.filter(v => v.severity === "HIGH").length;
  const resolvedCount = mockVulnerabilities.filter(v => v.status === "done").length;
  const inProgressCount = mockVulnerabilities.filter(v => v.status === "in-progress" || v.status === "in-review").length;

  // Get recent vulnerabilities
  const recentVulns = [...mockVulnerabilities]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 5);

  return (
    <div className="p-8 pb-20">
      {/* Header - Asymmetric */}
      <div className="mb-12">
        <div className="flex items-start justify-between">
          <div className="max-w-2xl">
            <h1 className="text-5xl font-bold tracking-tight mb-3 font-serif italic">
              Security Overview
            </h1>
            <p className="text-lg text-neutral-600">
              Real-time vulnerability tracking across{" "}
              <span className="font-semibold text-neutral-900">{mockProjects.length} repositories</span>
            </p>
          </div>
          <div className="text-right">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-neutral-200 rounded-full text-sm mb-2">
              <div className="w-2 h-2 bg-lime-400 rounded-full animate-pulse" />
              <span className="text-neutral-600">Live</span>
            </div>
            <p className="text-xs text-neutral-500">Last scan: 2 min ago</p>
          </div>
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-12 gap-4 mb-8">
        {/* Critical Alert - Large */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="col-span-5 row-span-2 bg-red-50 border-2 border-red-200 rounded-2xl p-8 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-100 rounded-full -mr-16 -mt-16" />
          <div className="relative">
            <div className="mb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 border border-red-200 rounded-full text-xs font-semibold text-red-700 mb-4">
                <AlertTriangle className="w-3 h-3" />
                CRITICAL
              </div>
            </div>
            <div className="mb-6">
              <div className="text-6xl font-bold mb-2">{criticalCount}</div>
              <p className="text-neutral-700 text-lg">Critical vulnerabilities requiring immediate attention</p>
            </div>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium">
              View Details
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>

        {/* Total Vulnerabilities */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="col-span-4 bg-white border border-neutral-200 rounded-2xl p-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-neutral-500 mb-1">Total Vulnerabilities</p>
              <div className="text-4xl font-bold">{totalVulns}</div>
            </div>
            <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-neutral-600" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <TrendingDown className="w-4 h-4 text-green-600" />
            <span className="text-green-600 font-semibold">12%</span>
            <span className="text-neutral-500">vs last week</span>
          </div>
        </motion.div>

        {/* Resolved */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="col-span-3 bg-lime-400 border-2 border-lime-500 rounded-2xl p-6"
        >
          <CheckCircle2 className="w-8 h-8 mb-3" />
          <div className="text-3xl font-bold mb-1">{resolvedCount}</div>
          <p className="text-sm font-medium">Resolved</p>
        </motion.div>

        {/* High Priority */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="col-span-4 bg-white border border-neutral-200 rounded-2xl p-6 dot-pattern-dense"
        >
          <div className="relative bg-white/80 backdrop-blur-sm p-4 rounded-lg">
            <p className="text-sm text-neutral-500 mb-1">High Priority</p>
            <div className="text-4xl font-bold mb-2">{highCount}</div>
            <div className="flex items-center gap-1">
              <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full" style={{ width: `${(highCount / totalVulns) * 100}%` }} />
              </div>
            </div>
          </div>
        </motion.div>

        {/* In Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="col-span-3 bg-violet-600 text-white rounded-2xl p-6"
        >
          <div className="mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mb-3">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold mb-1">{inProgressCount}</div>
          <p className="text-sm text-violet-100">In Progress</p>
        </motion.div>
      </div>

      {/* Recent Activity - Asymmetric List */}
      <div className="mb-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold font-serif italic mb-1">Recent Activity</h2>
            <p className="text-neutral-600">Latest vulnerability updates</p>
          </div>
          <button className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors">
            View all →
          </button>
        </div>

        <div className="space-y-3">
          {recentVulns.map((vuln, index) => (
            <motion.div
              key={vuln.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.05 }}
              className="bg-white border border-neutral-200 rounded-xl p-5 hover:border-neutral-300 transition-all cursor-pointer group"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 pt-1">
                  <div 
                    className={`w-2 h-2 rounded-full ${
                      vuln.severity === "CRITICAL" ? "bg-red-500" :
                      vuln.severity === "HIGH" ? "bg-orange-500" :
                      vuln.severity === "MEDIUM" ? "bg-yellow-500" :
                      "bg-green-500"
                    }`}
                  />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <h3 className="font-semibold text-neutral-900 mb-1 group-hover:text-violet-600 transition-colors">
                        {vuln.summary}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-neutral-500">
                        <span className="font-mono text-xs">{vuln.package}</span>
                        <span>•</span>
                        <span className="font-mono text-xs">{vuln.osvId}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        vuln.severity === "CRITICAL" ? "bg-red-100 text-red-700 border border-red-200" :
                        vuln.severity === "HIGH" ? "bg-orange-100 text-orange-700 border border-orange-200" :
                        vuln.severity === "MEDIUM" ? "bg-yellow-100 text-yellow-700 border border-yellow-200" :
                        "bg-green-100 text-green-700 border border-green-200"
                      }`}>
                        {vuln.severity}
                      </div>
                      <p className="text-xs text-neutral-400 mt-1">
                        CVSS {vuln.cvssScore}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {vuln.assignedTo && (
                      <div className="flex items-center gap-2 text-sm text-neutral-600">
                        <div className="w-5 h-5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center text-[10px] font-semibold text-white">
                          {vuln.assignedTo.avatar}
                        </div>
                        <span>{vuln.assignedTo.name}</span>
                      </div>
                    )}
                    <div className={`px-2 py-0.5 rounded text-xs font-medium ${
                      vuln.status === "done" ? "bg-lime-100 text-lime-800" :
                      vuln.status === "in-progress" ? "bg-blue-100 text-blue-800" :
                      vuln.status === "in-review" ? "bg-purple-100 text-purple-800" :
                      "bg-neutral-100 text-neutral-800"
                    }`}>
                      {vuln.status === "done" ? "Resolved" :
                       vuln.status === "in-progress" ? "In Progress" :
                       vuln.status === "in-review" ? "In Review" :
                       "To Do"}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Projects Grid - Asymmetric */}
      <div>
        <h2 className="text-3xl font-bold font-serif italic mb-6">Active Projects</h2>
        
        <div className="grid grid-cols-2 gap-4">
          {mockProjects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + index * 0.1 }}
              className={`bg-white border border-neutral-200 rounded-2xl p-6 hover:border-neutral-300 transition-all cursor-pointer group ${
                index === 0 ? "border-2 border-neutral-900" : ""
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1 group-hover:text-violet-600 transition-colors">
                    {project.name}
                  </h3>
                  <p className="text-sm text-neutral-500 font-mono">{project.repository}</p>
                </div>
                {index === 0 && (
                  <div className="px-2 py-1 bg-lime-400 text-xs font-bold rounded">
                    MAIN
                  </div>
                )}
              </div>

              <div className="grid grid-cols-4 gap-2 mb-4">
                <div className="text-center p-2 bg-red-50 rounded-lg border border-red-100">
                  <div className="text-xl font-bold text-red-600">{project.criticalCount}</div>
                  <div className="text-[10px] text-neutral-500 uppercase tracking-wide">Critical</div>
                </div>
                <div className="text-center p-2 bg-orange-50 rounded-lg border border-orange-100">
                  <div className="text-xl font-bold text-orange-600">{project.highCount}</div>
                  <div className="text-[10px] text-neutral-500 uppercase tracking-wide">High</div>
                </div>
                <div className="text-center p-2 bg-yellow-50 rounded-lg border border-yellow-100">
                  <div className="text-xl font-bold text-yellow-600">{project.mediumCount}</div>
                  <div className="text-[10px] text-neutral-500 uppercase tracking-wide">Medium</div>
                </div>
                <div className="text-center p-2 bg-green-50 rounded-lg border border-green-100">
                  <div className="text-xl font-bold text-green-600">{project.lowCount}</div>
                  <div className="text-[10px] text-neutral-500 uppercase tracking-wide">Low</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500">
                  Last scan: {project.lastScan.toLocaleDateString()}
                </span>
                <span className="font-mono font-semibold">
                  {project.totalVulnerabilities} total
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
