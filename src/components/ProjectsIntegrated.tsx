import { FormEvent, useEffect, useState } from "react";
import { motion } from "motion/react";
import { FolderGit2, GitBranch, Plus, Search, ArrowUpRight, RefreshCw, X } from "lucide-react";
import { api, formatDate, Project } from "../lib/api";

export function ProjectsIntegrated() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [scanning, setScanning] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [message, setMessage] = useState("");

  const loadProjects = async () => {
    try {
      setProjects(await api.projects());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load projects");
    }
  };

  useEffect(() => {
    void loadProjects();
  }, []);

  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.repository.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleScan = async (projectId: string) => {
    try {
      setScanning(projectId);
      await api.scanProject(projectId);
      setMessage("Scan queued. The project will refresh when the scan completes.");
      await loadProjects();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to start scan");
    } finally {
      setScanning(null);
    }
  };

  const addProject = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const created = await api.createProject(repositoryUrl);
      setProjects((current) => [created, ...current]);
      setRepositoryUrl("");
      setShowAdd(false);
      setMessage(`Added ${created.name}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to add project");
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-5xl font-bold tracking-tight mb-2 font-serif italic">Projects</h1>
            <p className="text-lg text-neutral-600">Manage repositories and scan for vulnerabilities</p>
          </div>
          <button onClick={() => setShowAdd(true)} className="px-4 py-2 bg-black text-white rounded-lg hover:bg-neutral-800 transition-colors font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Project
          </button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input type="text" placeholder="Search projects..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all text-sm" />
        </div>
        {message && <Notice message={message} onClose={() => setMessage("")} />}
      </div>

      <div className="space-y-4">
        {filteredProjects.map((project, index) => (
          <motion.div key={project.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.05 }} onClick={() => setSelectedProject(project)} className={`bg-white border rounded-2xl p-6 hover:border-neutral-300 transition-all group cursor-pointer ${index === 0 ? "border-2 border-neutral-900" : "border-neutral-200"}`}>
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-neutral-100 rounded-xl flex items-center justify-center group-hover:bg-neutral-900 transition-colors">
                  <FolderGit2 className="w-6 h-6 text-neutral-600 group-hover:text-white transition-colors" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-xl group-hover:text-violet-600 transition-colors">{project.name}</h3>
                      {index === 0 && <div className="px-2 py-0.5 bg-lime-400 text-xs font-bold rounded">MAIN</div>}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-neutral-500">
                      <GitBranch className="w-3.5 h-3.5" />
                      <span className="font-mono text-xs">{project.repository}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); void handleScan(project.id); }} className="p-2 hover:bg-neutral-100 rounded-lg transition-colors" title="Run scan">
                      <RefreshCw className={`w-4 h-4 text-neutral-600 ${scanning === project.id ? "animate-spin" : ""}`} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setSelectedProject(project); }} className="p-2 hover:bg-neutral-100 rounded-lg transition-colors" title="View details">
                      <ArrowUpRight className="w-4 h-4 text-neutral-600" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-3 mb-4">
                  <Count label="Critical" value={project.criticalCount} className="bg-red-50 border-red-100 text-red-600" />
                  <Count label="High" value={project.highCount} className="bg-orange-50 border-orange-100 text-orange-600" />
                  <Count label="Medium" value={project.mediumCount} className="bg-yellow-50 border-yellow-100 text-yellow-600" />
                  <Count label="Low" value={project.lowCount} className="bg-green-50 border-green-100 text-green-600" />
                  <Count label="Total" value={project.totalVulnerabilities} className="bg-neutral-100 border-neutral-200 text-neutral-900" />
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
                  <span className="text-sm text-neutral-500">Last scan: <span className="text-neutral-900 font-medium">{formatDate(project.lastScan)}</span></span>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${project.scanStatus === "error" ? "bg-red-500" : "bg-lime-400"}`} />
                    <span className="text-sm text-neutral-600 font-medium">{project.scanStatus}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-neutral-50 border-2 border-dashed border-neutral-300 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-neutral-200 rounded-2xl flex items-center justify-center mx-auto mb-4"><Search className="w-8 h-8 text-neutral-400" /></div>
          <h3 className="text-xl font-semibold mb-2">No projects found</h3>
          <p className="text-neutral-600 mb-6">Try adjusting your search or add a new project</p>
          <button onClick={() => setShowAdd(true)} className="px-6 py-3 bg-black text-white rounded-lg hover:bg-neutral-800 transition-colors font-medium inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Your First Project
          </button>
        </motion.div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
          <form onSubmit={addProject} className="bg-white rounded-2xl border border-neutral-200 shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-2xl font-bold">Add Project</h2>
              <button type="button" onClick={() => setShowAdd(false)} className="p-2 hover:bg-neutral-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <label className="text-sm font-medium">
              Repository URL
              <input required value={repositoryUrl} onChange={(e) => setRepositoryUrl(e.target.value)} placeholder="https://github.com/company/repo" className="mt-2 w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900" />
            </label>
            <button className="mt-6 w-full px-4 py-3 bg-black text-white rounded-lg hover:bg-neutral-800">Add and Queue Scan</button>
          </form>
        </div>
      )}

      {selectedProject && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-xl max-w-lg w-full p-6">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h2 className="text-2xl font-bold">{selectedProject.name}</h2>
                <p className="text-sm text-neutral-500 font-mono mt-1">{selectedProject.repository}</p>
              </div>
              <button onClick={() => setSelectedProject(null)} className="p-2 hover:bg-neutral-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <Info label="Scan Status" value={selectedProject.scanStatus} />
              <Info label="Last Scan" value={formatDate(selectedProject.lastScan)} />
              <Info label="Total Vulnerabilities" value={String(selectedProject.totalVulnerabilities)} />
              <Info label="Critical" value={String(selectedProject.criticalCount)} />
            </div>
            {selectedProject.scanError && <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-3">{selectedProject.scanError}</p>}
            <button onClick={() => void handleScan(selectedProject.id)} className="w-full px-4 py-3 bg-black text-white rounded-lg hover:bg-neutral-800">Run Scan</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Count({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className={`p-3 border rounded-lg ${className}`}>
      <div className="text-2xl font-bold mb-0.5">{value}</div>
      <div className="text-[10px] text-neutral-500 uppercase tracking-wide font-semibold">{label}</div>
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

function Notice({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="mt-4 bg-white border border-neutral-200 rounded-lg px-4 py-3 text-sm text-neutral-700 flex items-center justify-between">
      <span>{message}</span>
      <button onClick={onClose} className="text-neutral-400 hover:text-neutral-900"><X className="w-4 h-4" /></button>
    </div>
  );
}
