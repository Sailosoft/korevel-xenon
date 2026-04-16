"use client";
import React, { useState, useMemo } from "react";

// Pure SVG Icon Components for a cleaner main component
const Icons = {
  Search: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-full h-full"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  ),
  Plus: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-full h-full"
    >
      <path d="M5 12h14m-7-7v14" />
    </svg>
  ),
  Globe: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-full h-full"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20M2 12h20" />
    </svg>
  ),
  Shield: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-full h-full"
    >
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z" />
    </svg>
  ),
  Zap: ({ fill = "none" }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-full h-full"
    >
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  ),
  LayoutGrid: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-full h-full"
    >
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </svg>
  ),
  List: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-full h-full"
    >
      <line x1="8" x2="21" y1="6" y2="6" />
      <line x1="8" x2="21" y1="12" y2="12" />
      <line x1="8" x2="21" y1="18" y2="18" />
      <line x1="3" x2="3.01" y1="6" y2="6" />
      <line x1="3" x2="3.01" y1="12" y2="12" />
      <line x1="3" x2="3.01" y1="18" y2="18" />
    </svg>
  ),
  MoreVertical: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-full h-full"
    >
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="19" r="1" />
    </svg>
  ),
  Copy: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-full h-full"
    >
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  ),
  Check: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-full h-full"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  ChevronRight: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-full h-full"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  ),
  Bell: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-full h-full"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  ),
  Server: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-full h-full"
    >
      <rect width="20" height="8" x="2" y="2" rx="2" ry="2" />
      <rect width="20" height="8" x="2" y="14" rx="2" ry="2" />
      <line x1="6" x2="6.01" y1="6" y2="6" />
      <line x1="6" x2="6.01" y1="18" y2="18" />
      <line x1="10" x2="10.01" y1="6" y2="6" />
      <line x1="10" x2="10.01" y1="18" y2="18" />
    </svg>
  ),
  Activity: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-full h-full"
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  LogOut: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-full h-full"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  ),
  LayoutDashboard: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-full h-full"
    >
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  ),
};

export default function Home() {
  const [viewMode, setViewMode] = useState("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const [applications, setApplications] = useState([
    {
      id: 1,
      name: "Customer Portal",
      url: "/apps/customer-portal",
      status: "Active",
      category: "Frontend",
      latency: "42ms",
      icon: <Icons.Globe />,
    },
    {
      id: 2,
      name: "Admin Dashboard",
      url: "/apps/admin",
      status: "Maintenance",
      category: "Internal",
      latency: "120ms",
      icon: <Icons.Shield />,
    },
    {
      id: 3,
      name: "Payment Gateway",
      url: "/api/v1/payments",
      status: "Active",
      category: "API",
      latency: "12ms",
      icon: <Icons.Zap />,
    },
    {
      id: 4,
      name: "Auth Service",
      url: "/auth",
      status: "Active",
      category: "Core",
      latency: "8ms",
      icon: <Icons.Shield />,
    },
    {
      id: 5,
      name: "Analytics Hub",
      url: "/analytics",
      status: "Draft",
      category: "Internal",
      latency: "-",
      icon: <Icons.LayoutGrid />,
    },
  ]);

  const categories = [
    "All",
    ...new Set(applications.map((app) => app.category)),
  ];

  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      const matchesSearch =
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.url.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTab = activeTab === "All" || app.category === activeTab;
      return matchesSearch && matchesTab;
    });
  }, [searchQuery, activeTab, applications]);

  const handleCopy = (url: string, id: number) => {
    const textArea = document.createElement("textarea");
    textArea.value = url;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);

    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const addNewApp = () => {
    const newApp = {
      id: Date.now(),
      name: "New Application",
      url: "/new-route",
      status: "Draft",
      category: "Internal",
      latency: "-",
      icon: <Icons.Server />,
    };
    setApplications([newApp, ...applications]);
  };

  return (
    <div className="flex h-screen bg-white text-slate-950">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 hidden md:flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-2 font-semibold text-lg tracking-tight">
            <div className="bg-slate-950 text-white p-1.5 rounded flex items-center justify-center w-8 h-8">
              <Icons.Zap fill="currentColor" />
            </div>
            <span>RouteManager</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2">
            Main
          </div>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium bg-slate-100 text-slate-900 rounded-md">
            <div className="w-4 h-4">
              <Icons.LayoutDashboard />
            </div>{" "}
            Dashboard
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-md transition-colors">
            <div className="w-4 h-4">
              <Icons.Server />
            </div>{" "}
            Deployments
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-md transition-colors">
            <div className="w-4 h-4">
              <Icons.Activity />
            </div>{" "}
            Monitoring
          </button>

          <div className="pt-6">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2">
              Categories
            </div>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`w-full flex justify-between items-center px-3 py-2 text-sm font-medium rounded-md transition-all ${
                  activeTab === cat
                    ? "bg-slate-950 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {cat}
                {activeTab !== cat && (
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full border border-slate-200">
                    {cat === "All"
                      ? applications.length
                      : applications.filter((a) => a.category === cat).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </nav>

        <div className="p-4 border-t border-slate-200">
          <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-md transition-colors">
            <div className="w-4 h-4">
              <Icons.LogOut />
            </div>{" "}
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 border-b border-slate-200 flex items-center justify-between px-8 bg-white/80 backdrop-blur-sm z-10">
          <div className="flex-1 max-w-xl">
            <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors w-4 h-4">
                <Icons.Search />
              </div>
              <input
                type="text"
                placeholder="Search routes..."
                className="w-full pl-9 pr-4 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-md focus:ring-1 focus:ring-slate-950 focus:border-slate-950 transition-all outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-3 ml-4">
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-md transition-colors relative">
              <div className="w-4 h-4">
                <Icons.Bell />
              </div>
              <span className="absolute top-2 right-2.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-white"></span>
            </button>
            <button
              onClick={addNewApp}
              className="flex items-center gap-2 bg-slate-950 text-white px-3 py-1.5 text-sm font-medium rounded-md hover:bg-slate-800 transition-all active:scale-[0.98] shadow-sm"
            >
              <div className="w-3.5 h-3.5">
                <Icons.Plus />
              </div>{" "}
              New App
            </button>
          </div>
        </header>

        {/* Dynamic Content Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/40">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Applications
              </h2>
              <p className="text-slate-500 text-sm">
                Manage and monitor your service endpoints.
              </p>
            </div>

            <div className="inline-flex p-1 bg-white border border-slate-200 rounded-lg shadow-sm">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-md transition-all ${viewMode === "grid" ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:text-slate-600"}`}
              >
                <div className="w-4 h-4">
                  <Icons.LayoutGrid />
                </div>
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:text-slate-600"}`}
              >
                <div className="w-4 h-4">
                  <Icons.List />
                </div>
              </button>
            </div>
          </div>

          {filteredApps.length > 0 ? (
            viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredApps.map((app) => (
                  <div
                    key={app.id}
                    className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between h-[180px]"
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <div
                          className={`p-2 rounded-md w-8 h-8 flex items-center justify-center ${app.status === "Active" ? "bg-slate-100" : "bg-red-50"}`}
                        >
                          {app.icon}
                        </div>
                        <div className="flex gap-0.5">
                          <button
                            onClick={() => handleCopy(app.url, app.id)}
                            className="p-1.5 text-slate-400 hover:text-slate-900 rounded-md transition-all"
                          >
                            <div className="w-3.5 h-3.5">
                              {copiedId === app.id ? (
                                <Icons.Check />
                              ) : (
                                <Icons.Copy />
                              )}
                            </div>
                          </button>
                          <button className="p-1.5 text-slate-400 hover:text-slate-900">
                            <div className="w-3.5 h-3.5">
                              <Icons.MoreVertical />
                            </div>
                          </button>
                        </div>
                      </div>
                      <div className="mt-3">
                        <h3 className="font-semibold text-slate-900 truncate">
                          {app.name}
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-1 font-mono truncate bg-slate-50 p-1 rounded border border-slate-100">
                          {app.url}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-auto">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            app.status === "Active"
                              ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                              : app.status === "Maintenance"
                                ? "bg-amber-500"
                                : "bg-slate-300"
                          }`}
                        ></span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                          {app.status}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        LATENCY{" "}
                        <span className="text-slate-900 font-bold ml-1">
                          {app.latency}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-3 font-semibold text-slate-500 text-[11px] uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 font-semibold text-slate-500 text-[11px] uppercase tracking-wider">
                        Endpoint
                      </th>
                      <th className="px-6 py-3 font-semibold text-slate-500 text-[11px] uppercase tracking-wider text-center">
                        Latency
                      </th>
                      <th className="px-6 py-3 font-semibold text-slate-500 text-[11px] uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredApps.map((app) => (
                      <tr
                        key={app.id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-4 h-4 text-slate-400">
                              {app.icon}
                            </div>
                            <span className="font-semibold text-slate-900">
                              {app.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <code className="text-[11px] bg-slate-50 px-1.5 py-0.5 border border-slate-200 rounded text-slate-600 font-mono">
                            {app.url}
                          </code>
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-xs text-slate-500">
                          {app.latency}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight border ${
                              app.status === "Active"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : app.status === "Maintenance"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-slate-50 text-slate-600 border-slate-200"
                            }`}
                          >
                            {app.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="p-1 text-slate-400 hover:text-slate-900 rounded-md transition-all">
                            <div className="w-4 h-4">
                              <Icons.ChevronRight />
                            </div>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center py-24 bg-white rounded-xl border border-dashed border-slate-200 shadow-inner">
              <div className="w-12 h-12 text-slate-200 mb-4">
                <Icons.Search />
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                No applications found
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Try searching for a different keyword or category.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setActiveTab("All");
                }}
                className="mt-6 text-sm font-medium text-slate-900 border border-slate-200 px-4 py-2 rounded-md hover:bg-slate-50 transition-all shadow-sm"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
