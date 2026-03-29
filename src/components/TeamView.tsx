import { useState } from "react";
import { motion } from "motion/react";
import { Mail, Crown, Code, Search, UserPlus, TrendingUp } from "lucide-react";
import { mockUsers, mockVulnerabilities } from "../lib/mockData";

export function TeamView() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredUsers = mockUsers.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getUserStats = (userId: string) => {
    const assigned = mockVulnerabilities.filter((v) => v.assignedTo?.id === userId);
    const completed = assigned.filter((v) => v.status === "done");
    const inProgress = assigned.filter(
      (v) => v.status === "in-progress" || v.status === "in-review"
    );

    return {
      total: assigned.length,
      completed: completed.length,
      inProgress: inProgress.length,
      completionRate:
        assigned.length > 0 ? Math.round((completed.length / assigned.length) * 100) : 0,
    };
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-5xl font-bold tracking-tight mb-2 font-serif italic">
              Team
            </h1>
            <p className="text-lg text-neutral-600">
              Manage team members and track their progress
            </p>
          </div>
          <button className="px-4 py-2 bg-black text-white rounded-lg hover:bg-neutral-800 transition-colors font-medium flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Add Member
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search team members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all text-sm"
          />
        </div>
      </div>

      {/* Team Grid - Asymmetric Bento */}
      <div className="grid grid-cols-12 gap-4">
        {filteredUsers.map((user, index) => {
          const stats = getUserStats(user.id);
          const RoleIcon = user.role === "manager" ? Crown : Code;
          const isManager = user.role === "manager";

          return (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={`bg-white border border-neutral-200 rounded-2xl p-6 hover:border-neutral-300 transition-all group cursor-pointer ${
                isManager ? "col-span-8" : "col-span-6"
              }`}
            >
              <div className="flex items-start gap-4 mb-6">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center text-lg font-bold text-white">
                    {user.avatar}
                  </div>
                  <div
                    className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center ${
                      isManager ? "bg-violet-600" : "bg-neutral-900"
                    }`}
                  >
                    <RoleIcon className="w-3 h-3 text-white" />
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg mb-1 group-hover:text-violet-600 transition-colors">
                    {user.name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
                    <Mail className="w-3.5 h-3.5" />
                    <span className="truncate">{user.email}</span>
                  </div>
                  <div
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      isManager
                        ? "bg-violet-100 text-violet-700 border border-violet-200"
                        : "bg-neutral-100 text-neutral-700 border border-neutral-200"
                    }`}
                  >
                    <RoleIcon className="w-3 h-3" />
                    {isManager ? "Manager" : "Developer"}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-100">
                  <div className="text-2xl font-bold text-neutral-900 mb-0.5">
                    {stats.total}
                  </div>
                  <div className="text-xs text-neutral-500 font-medium">Assigned</div>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="text-2xl font-bold text-blue-600 mb-0.5">
                    {stats.inProgress}
                  </div>
                  <div className="text-xs text-neutral-500 font-medium">In Progress</div>
                </div>
                <div className="p-3 bg-lime-50 rounded-lg border border-lime-200">
                  <div className="text-2xl font-bold text-lime-700 mb-0.5">
                    {stats.completed}
                  </div>
                  <div className="text-xs text-neutral-500 font-medium">Completed</div>
                </div>
              </div>

              {/* Completion Rate */}
              <div className="pt-4 border-t border-neutral-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-sm text-neutral-600">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span className="font-medium">Completion Rate</span>
                  </div>
                  <span className="text-sm font-mono font-bold">{stats.completionRate}%</span>
                </div>
                <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.completionRate}%` }}
                    transition={{ duration: 0.8, delay: 0.3 + index * 0.1 }}
                    className={`h-full rounded-full ${
                      stats.completionRate >= 75
                        ? "bg-lime-500"
                        : stats.completionRate >= 50
                        ? "bg-yellow-500"
                        : "bg-orange-500"
                    }`}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredUsers.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-neutral-50 border-2 border-dashed border-neutral-300 rounded-2xl p-12 text-center"
        >
          <div className="w-16 h-16 bg-neutral-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No team members found</h3>
          <p className="text-neutral-600">Try adjusting your search</p>
        </motion.div>
      )}
    </div>
  );
}
