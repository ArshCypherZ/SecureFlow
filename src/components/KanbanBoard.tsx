import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
import { VulnerabilityTicket } from "./VulnerabilityTicket";
import { mockVulnerabilities, TicketStatus } from "../lib/mockData";

export function KanbanBoard() {
  const [tickets] = useState(mockVulnerabilities);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");

  const columns: { id: TicketStatus; label: string }[] = [
    { id: "todo", label: "Backlog" },
    { id: "in-progress", label: "In Progress" },
    { id: "in-review", label: "Review" },
    { id: "done", label: "Resolved" },
  ];

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.package.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.osvId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = filterSeverity === "all" || ticket.severity === filterSeverity;
    return matchesSearch && matchesSeverity;
  });

  const getTicketsByStatus = (status: TicketStatus) => {
    return filteredTickets.filter((ticket) => ticket.status === status);
  };

  return (
    <div className="p-8 h-screen flex flex-col">
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
          <button className="px-4 py-2 bg-black text-white rounded-lg hover:bg-neutral-800 transition-colors font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Ticket
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search vulnerabilities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-neutral-400" />
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="px-3 py-2.5 bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 transition-all text-sm cursor-pointer appearance-none pr-8"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23737373'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 0.5rem center",
                backgroundSize: "1.25rem",
              }}
            >
              <option value="all">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div className="px-3 py-2.5 bg-neutral-100 border border-neutral-200 rounded-lg">
            <span className="text-sm font-mono font-semibold text-neutral-900">
              {filteredTickets.length}
            </span>
            <span className="text-sm text-neutral-500 ml-1">items</span>
          </div>
        </div>
      </div>

      {/* Kanban Columns */}
      <div className="flex-1 grid grid-cols-4 gap-4 overflow-hidden">
        {columns.map((column, colIndex) => {
          const columnTickets = getTicketsByStatus(column.id);

          return (
            <div key={column.id} className="flex flex-col h-full">
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
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                <AnimatePresence mode="popLayout">
                  {columnTickets.map((ticket) => (
                    <VulnerabilityTicket key={ticket.id} ticket={ticket} />
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
    </div>
  );
}
