"use client";

import { useRouter } from "next/navigation";
import React, { useState, useMemo } from "react";

// Pure SVG Icon Components
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
  Loader: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-full h-full animate-spin"
    >
      <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
    </svg>
  ),
};

export default function AppPage() {
  const [viewMode, setViewMode] = useState("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const [currentRoute, setCurrentRoute] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);

  const [applications, setApplications] = useState([
    {
      id: 1,
      name: "Book Builder",
      url: "/modules/book-builder",
      status: "Active",
      category: "Frontend",
      latency: "42ms",
      icon: <Icons.Globe />,
    },
    {
      id: 2,
      name: "Concept Builder",
      url: "/modules/concept-builder",
      status: "Active",
      category: "Frontend",
      latency: "42ms",
      icon: <Icons.LayoutGrid />,
    },
    {
      id: 3,
      name: "Elven",
      url: "/modules/elven",
      status: "Active",
      category: "Frontend",
      latency: "42ms",
      icon: <Icons.Zap />,
    },
  ]);

  const categories = [
    "All",
    ...new Set(applications.map((app) => app.category)),
  ];

  const useRoute = useRouter();

  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      const matchesSearch =
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.url.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTab = activeTab === "All" || app.category === activeTab;
      return matchesSearch && matchesTab;
    });
  }, [searchQuery, activeTab, applications]);

  const handleRouteClick = (app: any) => {
    useRoute.push(app.url);
    if (isNavigating) return;
    setIsNavigating(true);
    setCurrentRoute(app.id);

    setTimeout(() => {
      setIsNavigating(false);
    }, 1200);
  };

  const handleCopy = (e: any, url: string, id: number) => {
    e.stopPropagation();
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
    <div className="flex h-screen bg-slate-50 text-slate-950 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 hidden md:flex flex-col bg-white">
        <div className="p-6">
          <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <div className="bg-slate-900 text-white p-1.5 rounded-lg flex items-center justify-center w-8 h-8">
              <Icons.Zap fill="currentColor" />
            </div>
            <span>RouteManager</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2 mt-4">
            Main Menu
          </div>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg shadow-sm">
            <div className="w-4 h-4">
              <Icons.LayoutDashboard />
            </div>{" "}
            Dashboard
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
            <div className="w-4 h-4">
              <Icons.Server />
            </div>{" "}
            Deployments
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
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
                className={`w-full flex justify-between items-center px-3 py-2 text-sm font-medium rounded-lg transition-all mb-1 ${
                  activeTab === cat
                    ? "bg-slate-100 text-slate-900 border border-slate-200"
                    : "text-slate-600 hover:bg-slate-50 border border-transparent"
                }`}
              >
                {cat}
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                    activeTab === cat
                      ? "bg-white border-slate-300"
                      : "bg-slate-100 border-slate-200"
                  }`}
                >
                  {cat === "All"
                    ? applications.length
                    : applications.filter((a) => a.category === cat).length}
                </span>
              </button>
            ))}
          </div>
        </nav>

        <div className="p-4 border-t border-slate-200">
          <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors group">
            <div className="w-4 h-4 group-hover:scale-110 transition-transform">
              <Icons.LogOut />
            </div>{" "}
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative bg-white md:rounded-l-3xl md:my-2 md:mr-2 border-l border-y border-slate-200 shadow-sm">
        {/* Top Loading Indicator */}
        <div
          className={`absolute top-0 left-0 right-0 h-1 z-50 overflow-hidden pointer-events-none ${isNavigating ? "opacity-100" : "opacity-0"}`}
        >
          <div className="h-full bg-slate-900 w-full -translate-x-full animate-[loading_1.5s_infinite_linear]"></div>
        </div>

        <style>{`
          @keyframes loading {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          @keyframes slideUp {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          .animate-slide-up {
            animation: slideUp 0.3s ease-out forwards;
          }
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #e2e8f0;
            border-radius: 10px;
          }
        `}</style>

        {/* Top Navbar */}
        <header className="h-16 border-b border-slate-100 flex items-center justify-between px-8 z-10">
          <div className="flex-1 max-w-xl">
            <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors w-4 h-4">
                <Icons.Search />
              </div>
              <input
                type="text"
                placeholder="Search resources..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-3 ml-4">
            <button className="p-2 text-slate-500 hover:bg-slate-50 rounded-full transition-colors relative border border-slate-100">
              <div className="w-4 h-4">
                <Icons.Bell />
              </div>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-8 w-px bg-slate-100 mx-2"></div>
            <button
              onClick={addNewApp}
              className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 text-sm font-semibold rounded-xl hover:bg-slate-800 hover:shadow-lg transition-all active:scale-[0.98]"
            >
              <div className="w-4 h-4">
                <Icons.Plus />
              </div>{" "}
              Add Service
            </button>
          </div>
        </header>

        {/* Scrollable View Area */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
                Endpoints
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                Direct access to your microservices and gateways.
              </p>
            </div>

            <div className="inline-flex p-1 bg-slate-50 border border-slate-200 rounded-xl">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-400 hover:text-slate-600"}`}
              >
                <div className="w-4 h-4">
                  <Icons.LayoutGrid />
                </div>
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-400 hover:text-slate-600"}`}
              >
                <div className="w-4 h-4">
                  <Icons.List />
                </div>
              </button>
            </div>
          </div>

          {filteredApps.length > 0 ? (
            viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredApps.map((app) => (
                  <div
                    key={app.id}
                    onClick={() => handleRouteClick(app)}
                    className={`group relative text-left bg-white rounded-2xl border transition-all flex flex-col justify-between h-[210px] outline-none cursor-pointer overflow-hidden
                      ${currentRoute === app.id && !isNavigating ? "border-slate-900 ring-4 ring-slate-900/5 shadow-xl" : "border-slate-200 hover:border-slate-400 shadow-sm hover:shadow-md hover:scale-[1.02]"}
                      ${isNavigating && currentRoute !== app.id ? "opacity-40 pointer-events-none" : "opacity-100"}
                    `}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleRouteClick(app)
                    }
                  >
                    {/* Upper Content Body */}
                    <div className="p-6 pb-2 flex-1 flex flex-col">
                      <div className="flex justify-between items-start w-full">
                        <div
                          className={`p-3 rounded-xl w-12 h-12 flex items-center justify-center transition-all duration-300 ${
                            currentRoute === app.id
                              ? "bg-slate-900 text-white shadow-inner"
                              : "bg-slate-50 text-slate-600 group-hover:bg-slate-100"
                          }`}
                        >
                          {isNavigating && currentRoute === app.id ? (
                            <div className="w-6 h-6">
                              <Icons.Loader />
                            </div>
                          ) : (
                            app.icon
                          )}
                        </div>
                        <button
                          onClick={(e) => handleCopy(e, app.url, app.id)}
                          className="p-2 text-slate-400 hover:text-slate-900 rounded-lg transition-all bg-slate-50 hover:bg-white border border-transparent hover:border-slate-200 shadow-none hover:shadow-sm"
                          title="Copy URL"
                        >
                          <div className="w-4 h-4">
                            {copiedId === app.id ? (
                              <Icons.Check />
                            ) : (
                              <Icons.Copy />
                            )}
                          </div>
                        </button>
                      </div>

                      <div className="mt-4">
                        <h3 className="font-bold text-lg text-slate-900 truncate tracking-tight">
                          {app.name}
                        </h3>
                        <div className="mt-1.5 flex items-center gap-1.5 overflow-hidden">
                          <code className="text-[10px] text-slate-500 font-mono truncate bg-slate-50 px-2 py-1 rounded border border-slate-100 block max-w-full">
                            {app.url}
                          </code>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Fixed Footer - Contained within border */}
                    <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between mt-auto">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            app.status === "Active"
                              ? "bg-emerald-500"
                              : app.status === "Maintenance"
                                ? "bg-amber-500"
                                : "bg-slate-300"
                          }`}
                        ></span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                          {app.status}
                        </span>
                      </div>

                      <div className="flex items-center text-slate-900 font-bold text-[10px] uppercase tracking-wider gap-1 group-hover:translate-x-0.5 transition-transform duration-200 opacity-0 group-hover:opacity-100">
                        Launch{" "}
                        <div className="w-3 h-3">
                          <Icons.ChevronRight />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100">
                      <th className="px-6 py-4 font-bold text-slate-500 text-[11px] uppercase tracking-widest">
                        Application
                      </th>
                      <th className="px-6 py-4 font-bold text-slate-500 text-[11px] uppercase tracking-widest">
                        Endpoint Path
                      </th>
                      <th className="px-6 py-4 font-bold text-slate-500 text-[11px] uppercase tracking-widest text-center">
                        Avg Latency
                      </th>
                      <th className="px-6 py-4 font-bold text-slate-500 text-[11px] uppercase tracking-widest">
                        Status
                      </th>
                      <th className="px-6 py-4 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredApps.map((app) => (
                      <tr
                        key={app.id}
                        onClick={() => handleRouteClick(app)}
                        className={`group transition-all cursor-pointer 
                          ${currentRoute === app.id ? "bg-slate-50 shadow-inner" : "hover:bg-slate-50/50"}
                          ${isNavigating && currentRoute === app.id ? "opacity-50" : ""}
                        `}
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${currentRoute === app.id ? "bg-slate-900 text-white" : "text-slate-400 bg-slate-50 group-hover:bg-white border border-slate-100 group-hover:border-slate-200"}`}
                            >
                              {isNavigating && currentRoute === app.id ? (
                                <div className="w-5 h-5">
                                  <Icons.Loader />
                                </div>
                              ) : (
                                app.icon
                              )}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block tracking-tight">
                                {app.name}
                              </span>
                              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
                                {app.category}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <code className="text-[12px] bg-slate-50 px-2 py-1 border border-slate-100 rounded-md text-slate-600 font-mono">
                            {app.url}
                          </code>
                        </td>
                        <td className="px-6 py-5 text-center font-mono text-xs font-bold text-slate-700">
                          {app.latency}
                        </td>
                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight border shadow-sm ${
                              app.status === "Active"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                : app.status === "Maintenance"
                                  ? "bg-amber-50 text-amber-700 border-amber-100"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            <span
                              className={`w-1 h-1 rounded-full mr-1.5 ${app.status === "Active" ? "bg-emerald-500" : "bg-amber-500"}`}
                            ></span>
                            {app.status}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="p-2 text-slate-300 group-hover:text-slate-900 transition-all">
                            <div className="w-5 h-5">
                              <Icons.ChevronRight />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center py-32 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200 text-center">
              <div className="w-16 h-16 text-slate-200 mb-6 mx-auto">
                <Icons.Search />
              </div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                No endpoints match your query
              </h3>
              <p className="text-slate-500 mt-2 max-w-xs mx-auto">
                Try refining your search terms or selecting a different category
                from the sidebar.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setActiveTab("All");
                }}
                className="mt-8 text-sm font-bold text-slate-900 bg-white border border-slate-200 px-6 py-3 rounded-xl hover:shadow-lg transition-all"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Action Bar */}
        {currentRoute && !isNavigating && (
          <div className="mx-8 mb-6 h-16 bg-slate-900 rounded-2xl px-6 flex items-center justify-between text-white shadow-2xl animate-slide-up ring-4 ring-slate-900/10">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-8 h-8 bg-white/10 rounded-lg">
                <div className="w-4 h-4 text-white">
                  {applications.find((a) => a.id === currentRoute)?.icon}
                </div>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase block leading-none mb-1">
                  Application Loaded
                </span>
                <span className="text-sm font-bold block leading-none">
                  {applications.find((a) => a.id === currentRoute)?.name}
                </span>
              </div>
              <div className="hidden sm:block h-6 w-px bg-white/10 mx-2"></div>
              <code className="hidden sm:block text-[11px] text-slate-400 font-mono">
                {applications.find((a) => a.id === currentRoute)?.url}
              </code>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setCurrentRoute(null)}
                className="text-xs font-bold px-4 py-2 hover:bg-white/5 rounded-xl transition-colors"
              >
                Dismiss
              </button>
              <button
                onClick={() =>
                  handleRouteClick(
                    applications.find((a) => a.id === currentRoute),
                  )
                }
                className="bg-white text-slate-900 px-5 py-2 text-xs font-bold rounded-xl hover:bg-slate-100 active:scale-95 transition-all shadow-lg"
              >
                Launch Dashboard
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
