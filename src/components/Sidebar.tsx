import { LayoutDashboard, Kanban, FolderGit2, Users, Settings, Shield, ChevronRight } from "lucide-react";
import { motion } from "motion/react";

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const menuItems = [
    { id: "dashboard", label: "Overview", icon: LayoutDashboard },
    { id: "kanban", label: "Board", icon: Kanban },
    { id: "projects", label: "Projects", icon: FolderGit2 },
    { id: "team", label: "Team", icon: Users },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-neutral-200 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-neutral-200">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-8 h-8 bg-black rounded-sm flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div className="absolute -right-1 -top-1 w-2 h-2 bg-lime-400 rounded-full" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">SecureFlow</h1>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors mb-1 group ${
                isActive
                  ? "bg-neutral-100 text-neutral-900"
                  : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{item.label}</span>
              </div>
              {isActive && (
                <ChevronRight className="w-4 h-4 text-neutral-400" />
              )}
            </button>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-neutral-200">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-50 cursor-pointer transition-colors">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center text-xs font-semibold text-white">
            SC
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-neutral-900 truncate">Sarah Chen</p>
            <p className="text-xs text-neutral-500 truncate">Manager</p>
          </div>
        </div>
      </div>
    </div>
  );
}
