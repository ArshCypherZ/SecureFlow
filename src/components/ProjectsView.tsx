import { useState } from "react";
import { motion } from "motion/react";
import { FolderGit2, GitBranch, Plus, Search, ArrowUpRight, RefreshCw } from "lucide-react";
import { mockProjects } from "../lib/mockData";

export function ProjectsView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [scanning, setScanning] = useState<string | null>(null);

  const filteredProjects = mockProjects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.repository.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleScan = (projectId: string) => {
    setScanning(projectId);
    setTimeout(() => setScanning(null), 2000);
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-5xl font-bold tracking-tight mb-2 font-serif italic">
              Projects
            </h1>
            <p className="text-lg text-neutral-600">
              Manage repositories and scan for vulnerabilities
            </p>
          </div>
          <button className="px-4 py-2 bg-black text-white rounded-lg hover:bg-neutral-800 transition-colors font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Project
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all text-sm"
          />
        </div>
      </div>

      {/* Projects Grid - Asymmetric */}
      <div className="space-y-4">
        {filteredProjects.map((project, index) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className={`bg-white border rounded-2xl p-6 hover:border-neutral-300 transition-all group cursor-pointer ${
              index === 0 ? "border-2 border-neutral-900" : "border-neutral-200"
            }`}
          >
            <div className="flex items-start gap-6">
              {/* Icon */}
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-neutral-100 rounded-xl flex items-center justify-center group-hover:bg-neutral-900 transition-colors">
                  <FolderGit2 className="w-6 h-6 text-neutral-600 group-hover:text-white transition-colors" />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-xl group-hover:text-violet-600 transition-colors">
                        {project.name}
                      </h3>
                      {index === 0 && (
                        <div className="px-2 py-0.5 bg-lime-400 text-xs font-bold rounded">
                          MAIN
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-neutral-500">
                      <GitBranch className="w-3.5 h-3.5" />
                      <span className="font-mono text-xs">{project.repository}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleScan(project.id);
                      }}
                      className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                    >
                      <RefreshCw
                        className={`w-4 h-4 text-neutral-600 ${
                          scanning === project.id ? "animate-spin" : ""
                        }`}
                      />
                    </button>
                    <button className="p-2 hover:bg-neutral-100 rounded-lg transition-colors">
                      <ArrowUpRight className="w-4 h-4 text-neutral-600" />
                    </button>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-5 gap-3 mb-4">
                  <div className="col-span-1 p-3 bg-red-50 border border-red-100 rounded-lg">
                    <div className="text-2xl font-bold text-red-600 mb-0.5">
                      {project.criticalCount}
                    </div>
                    <div className="text-[10px] text-neutral-500 uppercase tracking-wide font-semibold">
                      Critical
                    </div>
                  </div>
                  <div className="col-span-1 p-3 bg-orange-50 border border-orange-100 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600 mb-0.5">
                      {project.highCount}
                    </div>
                    <div className="text-[10px] text-neutral-500 uppercase tracking-wide font-semibold">
                      High
                    </div>
                  </div>
                  <div className="col-span-1 p-3 bg-yellow-50 border border-yellow-100 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600 mb-0.5">
                      {project.mediumCount}
                    </div>
                    <div className="text-[10px] text-neutral-500 uppercase tracking-wide font-semibold">
                      Medium
                    </div>
                  </div>
                  <div className="col-span-1 p-3 bg-green-50 border border-green-100 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 mb-0.5">
                      {project.lowCount}
                    </div>
                    <div className="text-[10px] text-neutral-500 uppercase tracking-wide font-semibold">
                      Low
                    </div>
                  </div>
                  <div className="col-span-1 p-3 bg-neutral-100 border border-neutral-200 rounded-lg">
                    <div className="text-2xl font-bold text-neutral-900 mb-0.5">
                      {project.totalVulnerabilities}
                    </div>
                    <div className="text-[10px] text-neutral-500 uppercase tracking-wide font-semibold">
                      Total
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
                  <span className="text-sm text-neutral-500">
                    Last scan: <span className="text-neutral-900 font-medium">{project.lastScan.toLocaleDateString()}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-lime-400 rounded-full" />
                    <span className="text-sm text-neutral-600 font-medium">Active</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {filteredProjects.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-neutral-50 border-2 border-dashed border-neutral-300 rounded-2xl p-12 text-center"
        >
          <div className="w-16 h-16 bg-neutral-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No projects found</h3>
          <p className="text-neutral-600 mb-6">
            Try adjusting your search or add a new project
          </p>
          <button className="px-6 py-3 bg-black text-white rounded-lg hover:bg-neutral-800 transition-colors font-medium inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Your First Project
          </button>
        </motion.div>
      )}
    </div>
  );
}
