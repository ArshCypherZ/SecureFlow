import {
  ChevronRight,
  FolderGit2,
  Kanban,
  LayoutDashboard,
  Settings,
  Shield,
  Users,
  X,
} from "lucide-react";
import type { User } from "../lib/api";

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  currentUser: User | null;
  mobileOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  { id: "dashboard", label: "Overview", description: "Security posture", icon: LayoutDashboard },
  { id: "kanban", label: "Board", description: "Tickets and flow", icon: Kanban },
  { id: "projects", label: "Projects", description: "Repositories and scans", icon: FolderGit2 },
  { id: "team", label: "Team", description: "People and workload", icon: Users },
  { id: "settings", label: "Settings", description: "Scan and access options", icon: Settings },
];

export function Sidebar({
  activeView,
  onViewChange,
  currentUser,
  mobileOpen,
  onClose,
}: SidebarProps) {
  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-40 bg-neutral-950/50 lg:hidden"
          onClick={onClose}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-neutral-200 bg-white transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-5">
          <button
            type="button"
            onClick={() => onViewChange("dashboard")}
            className="flex items-center gap-3 text-left"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-950 text-white shadow-sm">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight text-neutral-950">SecureFlow</p>
              <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">
                Vulnerability Ops
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-neutral-200 px-5 py-4">
          <div className="rounded-2xl border border-lime-200 bg-lime-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-lime-700">
              Signed In
            </p>
            <p className="mt-2 text-base font-semibold text-neutral-950">
              {currentUser?.name ?? "Workspace user"}
            </p>
            <p className="mt-1 text-sm text-neutral-600">@{currentUser?.username ?? "user"}</p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium capitalize text-neutral-700">
              <span className="h-2 w-2 rounded-full bg-lime-500" />
              {currentUser?.role ?? "viewer"}
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onViewChange(item.id)}
                className={`group flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                  isActive
                    ? "border-neutral-950 bg-neutral-950 text-white shadow-sm"
                    : "border-transparent bg-transparent text-neutral-700 hover:border-neutral-200 hover:bg-neutral-50 hover:text-neutral-950"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      isActive ? "bg-white/12" : "bg-neutral-100"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p
                      className={`text-xs ${
                        isActive ? "text-white/70" : "text-neutral-500"
                      }`}
                    >
                      {item.description}
                    </p>
                  </div>
                </div>
                <ChevronRight
                  className={`h-4 w-4 transition ${
                    isActive ? "text-white/80" : "text-neutral-300 group-hover:text-neutral-500"
                  }`}
                />
              </button>
            );
          })}
        </nav>

        <div className="border-t border-neutral-200 px-5 py-4">
          <div className="rounded-2xl bg-neutral-950 px-4 py-4 text-white">
            <p className="text-xs uppercase tracking-[0.22em] text-neutral-400">Workspace rule</p>
            <p className="mt-2 text-sm leading-relaxed text-neutral-100">
              Managers create and assign work. Developers move only their assigned tickets.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
