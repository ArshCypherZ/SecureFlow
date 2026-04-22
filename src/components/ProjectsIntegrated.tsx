import { FormEvent, useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowUpRight,
  FolderGit2,
  GitBranch,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { api, formatDate, type Project } from "../lib/api";
import { normalizeGitHubRepositoryInput } from "../lib/validators";

export function ProjectsIntegrated({ isManager }: { isManager: boolean }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [scanning, setScanning] = useState<string | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
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
      setMessage("Scan queued. Project data will refresh after completion.");
      await loadProjects();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to start scan");
    } finally {
      setScanning(null);
    }
  };

  const handleDeleteProject = async (project: Project) => {
    if (!isManager) return;
    const confirmed = window.confirm(
      `Delete ${project.name}? This removes the project and all tickets linked to it.`
    );
    if (!confirmed) return;

    try {
      setDeletingProjectId(project.id);
      await api.deleteProject(project.id);
      setProjects((current) => current.filter((item) => item.id !== project.id));
      setSelectedProject((current) => (current?.id === project.id ? null : current));
      setMessage(`Removed ${project.name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to remove project");
    } finally {
      setDeletingProjectId(null);
    }
  };

  const addProject = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedRepositoryUrl = normalizeGitHubRepositoryInput(repositoryUrl);
    if (!normalizedRepositoryUrl) {
      setMessage(
        "Enter a valid GitHub repository URL or owner/repository path, for example github.com/owner/repository."
      );
      return;
    }

    try {
      const created = await api.createProject(normalizedRepositoryUrl);
      setProjects((current) => [created, ...current]);
      setRepositoryUrl("");
      setShowAdd(false);
      setMessage(`Added ${created.name}. Initial scan queued.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to add project");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-neutral-500">
              Projects
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
              Repository onboarding
            </h1>
            <p className="mt-3 max-w-2xl text-base text-neutral-600">
              Connect GitHub repositories, inspect scan status, and review finding volume at a
              glance.
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            disabled={!isManager}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-neutral-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add Project
          </button>
        </div>

        <div className="mt-6 max-w-md">
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search repositories..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-12 w-full rounded-2xl border border-neutral-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-neutral-950"
            />
          </label>
        </div>

        {message ? <Notice message={message} onClose={() => setMessage("")} /> : null}
      </div>

      <div className="space-y-4">
        {filteredProjects.map((project, index) => (
          <motion.button
            key={project.id}
            type="button"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: index * 0.04 }}
            onClick={() => setSelectedProject(project)}
            className="group w-full rounded-[1.8rem] border border-neutral-200 bg-white p-6 text-left transition hover:border-neutral-300"
          >
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-700 transition group-hover:bg-neutral-950 group-hover:text-white">
                <FolderGit2 className="h-6 w-6" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <h3 className="text-2xl font-semibold tracking-tight text-neutral-950">
                      {project.name}
                    </h3>
                    <div className="mt-2 flex items-center gap-2 text-sm text-neutral-500">
                      <GitBranch className="h-4 w-4" />
                      <span className="truncate font-mono">{project.repository}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${statusPill(
                        project.scanStatus
                      )}`}
                    >
                      {project.scanStatus}
                    </span>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleScan(project.id);
                      }}
                      disabled={!isManager}
                      className="rounded-xl border border-neutral-200 p-2 text-neutral-700 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
                      title="Run scan"
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${scanning === project.id ? "animate-spin" : ""}`}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedProject(project);
                      }}
                      className="rounded-xl border border-neutral-200 p-2 text-neutral-700 transition hover:bg-neutral-100"
                      title="View details"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-5">
                  <Count label="Critical" value={project.criticalCount} className="bg-red-50 border-red-100 text-red-700" />
                  <Count label="High" value={project.highCount} className="bg-orange-50 border-orange-100 text-orange-700" />
                  <Count label="Medium" value={project.mediumCount} className="bg-yellow-50 border-yellow-100 text-yellow-700" />
                  <Count label="Low" value={project.lowCount} className="bg-green-50 border-green-100 text-green-700" />
                  <Count label="Total" value={project.totalVulnerabilities} className="bg-neutral-50 border-neutral-200 text-neutral-950" />
                </div>

                <div className="mt-5 flex flex-col gap-2 border-t border-neutral-100 pt-4 text-sm text-neutral-600 sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    Last scan:{" "}
                    <span className="font-semibold text-neutral-900">
                      {formatDate(project.lastScan)}
                    </span>
                  </span>
                  {project.scanError ? (
                    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                      {project.scanError}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {filteredProjects.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-[1.8rem] border-2 border-dashed border-neutral-300 bg-neutral-50 px-6 py-14 text-center"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm">
            <Search className="h-7 w-7 text-neutral-400" />
          </div>
          <h3 className="mt-5 text-xl font-semibold text-neutral-950">No repositories yet</h3>
          <p className="mt-2 text-neutral-600">
            Add a GitHub repository to generate findings and create tickets.
          </p>
          <button
            onClick={() => setShowAdd(true)}
            disabled={!isManager}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add Repository
          </button>
        </motion.div>
      ) : null}

      {showAdd && isManager ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 sm:p-6">
          <form
            onSubmit={addProject}
            className="w-full max-w-lg rounded-[1.8rem] border border-neutral-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-neutral-950">
                  Add repository
                </h2>
                <p className="mt-2 text-sm text-neutral-600">
                  Paste a GitHub URL or owner/repository path. The initial scan will start
                  automatically.
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

            <label className="mt-5 block text-sm font-medium text-neutral-700">
              Repository URL
              <input
                required
                value={repositoryUrl}
                onChange={(event) => setRepositoryUrl(event.target.value)}
                placeholder="https://github.com/owner/repository"
                autoComplete="off"
                spellCheck={false}
                className="mt-2 h-12 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 outline-none transition focus:border-neutral-950"
              />
            </label>

            <button className="mt-6 w-full rounded-2xl bg-neutral-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800">
              Add and scan
            </button>
          </form>
        </div>
      ) : null}

      {selectedProject ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 sm:p-6">
          <div className="w-full max-w-xl rounded-[1.8rem] border border-neutral-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-neutral-950">
                  {selectedProject.name}
                </h2>
                <p className="mt-2 break-all font-mono text-sm text-neutral-500">
                  {selectedProject.repository}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProject(null)}
                className="rounded-xl p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-950"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Info label="Scan status" value={selectedProject.scanStatus} />
              <Info label="Last scan" value={formatDate(selectedProject.lastScan)} />
              <Info
                label="Total vulnerabilities"
                value={String(selectedProject.totalVulnerabilities)}
              />
              <Info label="Critical" value={String(selectedProject.criticalCount)} />
            </div>

            {selectedProject.scanError ? (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {selectedProject.scanError}
              </div>
            ) : null}

            <button
              onClick={() => void handleScan(selectedProject.id)}
              disabled={!isManager || deletingProjectId === selectedProject.id}
              className="mt-6 w-full rounded-2xl bg-neutral-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Run fresh scan
            </button>
            {isManager ? (
              <button
                type="button"
                onClick={() => void handleDeleteProject(selectedProject)}
                disabled={deletingProjectId === selectedProject.id}
                className="mt-3 w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:border-red-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletingProjectId === selectedProject.id ? "Removing..." : "Delete project"}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Count({
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
      <div className="mt-2 text-sm font-semibold text-neutral-900">{value}</div>
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

function statusPill(status: Project["scanStatus"]): string {
  if (status === "error") return "bg-red-50 text-red-700";
  if (status === "ready") return "bg-lime-50 text-lime-800";
  if (status === "scanning") return "bg-blue-50 text-blue-700";
  if (status === "queued") return "bg-amber-50 text-amber-700";
  return "bg-neutral-100 text-neutral-700";
}
