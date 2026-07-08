"use client";

import { use, useCallback, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { lcDB } from "@/src/modules/lemon-coder/src/LCDatabase";
import { LCTheme } from "@/src/modules/lemon-coder/src/LCTheme";
import { Button, Input, Modal } from "@heroui/react";
import {
  ArrowLeft,
  FolderOpen,
  Calendar,
  Clock,
  MessageSquare,
  Trash2,
  Settings,
  FileCode,
  Info,
  ExternalLink,
  RefreshCw,
  Layers,
  FileText,
  Folder,
  Eye,
  Pencil,
  X,
} from "lucide-react";
import type { LCProject, LCChatSession } from "@/src/modules/lemon-coder/src/LCInterface";
import type { LCDeepstash, LCDeepstashItem } from "@/src/modules/lemon-coder/src/LCInterface";

const s = {
  brand: LCTheme.colors.brand,
  background: LCTheme.colors.background,
  text: LCTheme.colors.text,
  textSecondary: LCTheme.colors.textSecondary,
  border: LCTheme.colors.border,
  hover: LCTheme.colors.hover,
};

type TabId = "info" | "sessions" | "deepstash" | "config";

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const tabs: TabConfig[] = [
  { id: "info", label: "Info", icon: <Info className="w-3.5 h-3.5" /> },
  { id: "sessions", label: "Sessions", icon: <MessageSquare className="w-3.5 h-3.5" /> },
  { id: "deepstash", label: "Deepstash", icon: <Layers className="w-3.5 h-3.5" /> },
  { id: "config", label: "Configuration", icon: <Settings className="w-3.5 h-3.5" /> },
];

export default function LemonCoderProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("info");
  const [clearSessionConfirm, setClearSessionConfirm] = useState(false);
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
  const [deleteDeepstashId, setDeleteDeepstashId] = useState<string | null>(null);
  const [renameDeepstashId, setRenameDeepstashId] = useState<string | null>(null);
  const [renameDeepstashName, setRenameDeepstashName] = useState("");
  const [viewDeepstashItems, setViewDeepstashItems] = useState<LCDeepstashItem[] | null>(null);
  const [viewDeepstashName, setViewDeepstashName] = useState("");

  const project = useLiveQuery(() => lcDB.getProject(id), [id]);
  const sessions = useLiveQuery(
    () => (id ? lcDB.getChatSessions(id) : []),
    [id],
  );
  const deepstashes = useLiveQuery(
    () => (id ? lcDB.getDeepstashes(id) : []),
    [id],
  );

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateTime = (date: Date) => {
    return `${formatDate(date)} ${formatTime(date)}`;
  };

  const handleOpenStudio = useCallback(() => {
    router.push(`/modules/lemon-coder/studio?projectId=${encodeURIComponent(id)}`);
  }, [router, id]);

  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      await lcDB.deleteChatSession(sessionId);
      setDeleteSessionId(null);
    },
    [],
  );

  const handleClearSessions = useCallback(async () => {
    await lcDB.clearAllChatSessions(id);
    setClearSessionConfirm(false);
  }, [id]);

  const handleViewSession = useCallback(
    (session: LCChatSession) => {
      router.push(`/modules/lemon-coder/studio?projectId=${encodeURIComponent(id)}`);
    },
    [router, id],
  );

  // ── Deepstash handlers ────────────────────────────────────────────────────

  const handleDeleteDeepstash = useCallback(async () => {
    if (!deleteDeepstashId) return;
    await lcDB.deleteDeepstash(deleteDeepstashId);
    setDeleteDeepstashId(null);
  }, [deleteDeepstashId]);

  const handleRenameDeepstash = useCallback(async () => {
    if (!renameDeepstashId || !renameDeepstashName.trim()) return;
    await lcDB.renameDeepstash(renameDeepstashId, renameDeepstashName.trim());
    setRenameDeepstashId(null);
    setRenameDeepstashName("");
  }, [renameDeepstashId, renameDeepstashName]);

  const handleViewDeepstash = useCallback(async (deepstash: LCDeepstash) => {
    const items = await lcDB.getDeepstashItems(deepstash.id);
    setViewDeepstashName(deepstash.name);
    setViewDeepstashItems(items);
  }, []);

  if (!project) {
    return (
      <div
        className="flex items-center justify-center h-screen text-sm"
        style={{ backgroundColor: s.background, color: s.textSecondary }}
      >
        Loading project...
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{ backgroundColor: s.background, color: s.text }}
    >
      {/* Header */}
      <header
        className="flex items-center justify-between px-6 h-14 border-b shrink-0"
        style={{ backgroundColor: s.background, borderColor: s.border }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/modules/lemon-coder/projects")}
            className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
            style={{ color: s.brand }}
          >
            <ArrowLeft className="w-4 h-4" />
            Projects
          </button>
          <div className="w-px h-6" style={{ backgroundColor: s.border }} />
          <FolderOpen className="w-4 h-4" style={{ color: s.brand }} />
          <h1 className="text-lg font-bold" style={{ color: s.brand }}>
            {project.name}
          </h1>
        </div>

        <Button
          size="sm"
          className="text-xs h-8"
          style={{
            backgroundColor: s.brand,
            color: s.background,
          }}
          onPress={handleOpenStudio}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open in Studio
        </Button>
      </header>

      {/* Tabs */}
      <div
        className="flex items-center gap-1 px-6 h-10 border-b shrink-0"
        style={{ backgroundColor: s.background, borderColor: s.border }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 text-xs h-8 px-3 rounded-md transition-colors ${
              activeTab === tab.id
                ? "bg-[#e5c07b] text-[#1e1e1e]"
                : "text-[#858585] hover:text-white hover:bg-[#333333]"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Tab 1: Project Info */}
        {activeTab === "info" && (
          <div className="max-w-2xl mx-auto">
            <div
              className="rounded-lg border p-6 space-y-4"
              style={{ borderColor: s.border }}
            >
              <div className="flex items-center gap-3 pb-4 border-b" style={{ borderColor: s.border }}>
                <FolderOpen className="w-8 h-8" style={{ color: s.brand }} />
                <div>
                  <h2 className="text-base font-semibold">{project.name}</h2>
                  <p className="text-xs" style={{ color: s.textSecondary }}>
                    Project ID: {project.id}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div
                  className="rounded-lg p-3 border"
                  style={{ borderColor: s.border }}
                >
                  <div className="flex items-center gap-2 text-xs mb-1" style={{ color: s.textSecondary }}>
                    <Calendar className="w-3.5 h-3.5" />
                    Created
                  </div>
                  <p className="text-sm font-medium">
                    {formatDate(project.createdAt)}
                  </p>
                  <p className="text-xs" style={{ color: s.textSecondary }}>
                    {formatTime(project.createdAt)}
                  </p>
                </div>
                <div
                  className="rounded-lg p-3 border"
                  style={{ borderColor: s.border }}
                >
                  <div className="flex items-center gap-2 text-xs mb-1" style={{ color: s.textSecondary }}>
                    <Clock className="w-3.5 h-3.5" />
                    Last Opened
                  </div>
                  <p className="text-sm font-medium">
                    {formatDate(project.lastOpened)}
                  </p>
                  <p className="text-xs" style={{ color: s.textSecondary }}>
                    {formatTime(project.lastOpened)}
                  </p>
                </div>
              </div>

              <div
                className="rounded-lg p-3 border"
                style={{ borderColor: s.border }}
              >
                <div className="flex items-center gap-2 text-xs mb-1" style={{ color: s.textSecondary }}>
                  <MessageSquare className="w-3.5 h-3.5" />
                  Sessions
                </div>
                <p className="text-sm font-medium">
                  {sessions?.length || 0} session{(sessions?.length || 0) !== 1 ? "s" : ""}
                </p>
              </div>

              <div
                className="rounded-lg p-3 border"
                style={{ borderColor: s.border }}
              >
                <div className="flex items-center gap-2 text-xs mb-1" style={{ color: s.textSecondary }}>
                  <Layers className="w-3.5 h-3.5" />
                  Deepstashes
                </div>
                <p className="text-sm font-medium">
                  {deepstashes?.length || 0} deepstash{(deepstashes?.length || 0) !== 1 ? "es" : ""}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Sessions */}
        {activeTab === "sessions" && (
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold" style={{ color: s.text }}>
                Chat Sessions
              </h2>
              <div className="flex items-center gap-2">
                {sessions && sessions.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7 text-red-400 hover:bg-red-400/10"
                    onPress={() => setClearSessionConfirm(true)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear All Sessions
                  </Button>
                )}
              </div>
            </div>

            {!sessions || sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <MessageSquare className="w-12 h-12 mb-3" style={{ color: s.textSecondary }} />
                <p className="text-sm" style={{ color: s.textSecondary }}>
                  No chat sessions yet.
                </p>
                <p className="text-xs mt-1" style={{ color: s.textSecondary }}>
                  Start a conversation in the studio to create sessions.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:opacity-90"
                    style={{ borderColor: s.border }}
                  >
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => handleViewSession(session)}
                    >
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-3.5 h-3.5 shrink-0" style={{ color: s.brand }} />
                        <span className="text-sm font-medium truncate">
                          {session.title || "Untitled Session"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: s.textSecondary }}>
                        <span>{session.messages.length} message{session.messages.length !== 1 ? "s" : ""}</span>
                        <span>Created: {formatDate(session.createdAt)}</span>
                      </div>
                    </div>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="ghost"
                      className="w-6 h-6 min-w-0 text-red-400 hover:bg-red-400/10 shrink-0 ml-2"
                      onPress={() => setDeleteSessionId(session.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Deepstash */}
        {activeTab === "deepstash" && (
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold" style={{ color: s.text }}>
                Deepstashes
              </h2>
            </div>

            {!deepstashes || deepstashes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Layers className="w-12 h-12 mb-3" style={{ color: s.textSecondary }} />
                <p className="text-sm" style={{ color: s.textSecondary }}>
                  No deepstashes yet.
                </p>
                <p className="text-xs mt-1" style={{ color: s.textSecondary }}>
                  Save your context stash as a deepstash in the studio to create them.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {deepstashes.map((deepstash) => (
                  <div
                    key={deepstash.id}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors"
                    style={{ borderColor: s.border }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 shrink-0" style={{ color: s.brand }} />
                        <span className="text-sm font-medium truncate">
                          {deepstash.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: s.textSecondary }}>
                        <span>Created: {formatDateTime(deepstash.createdAt)}</span>
                        <span>Updated: {formatDateTime(deepstash.updatedAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="ghost"
                        className="w-6 h-6 min-w-0 text-[#858585] hover:text-[#e5c07b]"
                        onPress={() => handleViewDeepstash(deepstash)}
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="ghost"
                        className="w-6 h-6 min-w-0 text-[#858585] hover:text-[#e5c07b]"
                        onPress={() => {
                          setRenameDeepstashId(deepstash.id);
                          setRenameDeepstashName(deepstash.name);
                        }}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="ghost"
                        className="w-6 h-6 min-w-0 text-red-400 hover:bg-red-400/10"
                        onPress={() => setDeleteDeepstashId(deepstash.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Configuration (placeholder for future) */}
        {activeTab === "config" && (
          <div className="max-w-2xl mx-auto">
            <div
              className="rounded-lg border p-6 text-center"
              style={{ borderColor: s.border }}
            >
              <Settings className="w-12 h-12 mx-auto mb-3" style={{ color: s.textSecondary }} />
              <p className="text-sm" style={{ color: s.textSecondary }}>
                Project configuration will be available in a future update.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Clear All Sessions Confirmation Modal */}
      <Modal.Backdrop
        isOpen={clearSessionConfirm}
        onOpenChange={(open: boolean) => { if (!open) setClearSessionConfirm(false); }}
      >
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-sm bg-[#1e1e1e] text-white">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading className="text-white flex items-center gap-2 text-sm">
                <Trash2 className="w-4 h-4 text-red-400" />
                Clear All Sessions
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <p className="text-sm text-gray-300">
                This will permanently delete all chat sessions and their messages for this project.
              </p>
              <p className="text-xs text-red-400 mt-2">
                This action cannot be undone.
              </p>
            </Modal.Body>
            <Modal.Footer>
              <Button
                slot="close"
                variant="ghost"
                className="bg-transparent text-gray-300 hover:bg-[#333] text-xs"
              >
                Cancel
              </Button>
              <Button
                slot="close"
                onPress={handleClearSessions}
                className="bg-red-500 text-white hover:bg-red-600 text-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear All
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      {/* Delete Single Session Confirmation Modal */}
      <Modal.Backdrop
        isOpen={deleteSessionId !== null}
        onOpenChange={(open: boolean) => { if (!open) setDeleteSessionId(null); }}
      >
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-sm bg-[#1e1e1e] text-white">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading className="text-white flex items-center gap-2 text-sm">
                <Trash2 className="w-4 h-4 text-red-400" />
                Delete Session
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <p className="text-sm text-gray-300">
                This will permanently delete this chat session and all its messages.
              </p>
              <p className="text-xs text-red-400 mt-2">
                This action cannot be undone.
              </p>
            </Modal.Body>
            <Modal.Footer>
              <Button
                slot="close"
                variant="ghost"
                className="bg-transparent text-gray-300 hover:bg-[#333] text-xs"
              >
                Cancel
              </Button>
              <Button
                slot="close"
                onPress={() => deleteSessionId && handleDeleteSession(deleteSessionId)}
                className="bg-red-500 text-white hover:bg-red-600 text-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      {/* Delete Deepstash Confirmation Modal */}
      <Modal.Backdrop
        isOpen={deleteDeepstashId !== null}
        onOpenChange={(open: boolean) => { if (!open) setDeleteDeepstashId(null); }}
      >
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-sm bg-[#1e1e1e] text-white">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading className="text-white flex items-center gap-2 text-sm">
                <Trash2 className="w-4 h-4 text-red-400" />
                Delete Deepstash
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <p className="text-sm text-gray-300">
                This will permanently delete this deepstash and all its items.
              </p>
              <p className="text-xs text-red-400 mt-2">
                This action cannot be undone.
              </p>
            </Modal.Body>
            <Modal.Footer>
              <Button
                slot="close"
                variant="ghost"
                className="bg-transparent text-gray-300 hover:bg-[#333] text-xs"
              >
                Cancel
              </Button>
              <Button
                slot="close"
                onPress={handleDeleteDeepstash}
                className="bg-red-500 text-white hover:bg-red-600 text-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      {/* Rename Deepstash Modal */}
      <Modal.Backdrop
        isOpen={renameDeepstashId !== null}
        onOpenChange={(open: boolean) => { if (!open) { setRenameDeepstashId(null); setRenameDeepstashName(""); } }}
      >
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-sm bg-[#1e1e1e] text-white">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading className="text-white flex items-center gap-2 text-sm">
                <Pencil className="w-4 h-4 text-[#e5c07b]" />
                Rename Deepstash
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <div className="flex flex-col gap-3">
                <p className="text-sm text-gray-300">
                  Enter a new name for this deepstash.
                </p>
                <Input
                  autoFocus
                  placeholder="Deepstash name..."
                  value={renameDeepstashName}
                  onChange={(e) => setRenameDeepstashName(e.target.value)}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === "Enter") handleRenameDeepstash();
                  }}
                  className="bg-[#333] border-[#555] text-white placeholder:text-gray-500"
                />
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button
                slot="close"
                variant="ghost"
                className="bg-transparent text-gray-300 hover:bg-[#333] text-xs"
              >
                Cancel
              </Button>
              <Button
                slot="close"
                onPress={handleRenameDeepstash}
                className="bg-[#e5c07b] text-black hover:bg-[#d1a85e] text-xs"
              >
                <Pencil className="w-3.5 h-3.5" />
                Rename
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      {/* View Deepstash Items Modal */}
      <Modal.Backdrop
        isOpen={viewDeepstashItems !== null}
        onOpenChange={(open: boolean) => { if (!open) { setViewDeepstashItems(null); setViewDeepstashName(""); } }}
      >
        <Modal.Container className="bg-[#1e1e1e] border border-[#333] max-w-lg">
          <Modal.Dialog className="sm:max-w-lg bg-[#1e1e1e] text-white">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading className="text-white flex items-center gap-2 text-sm">
                <Layers className="w-4 h-4 text-[#e5c07b]" />
                {viewDeepstashName}
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              {viewDeepstashItems && viewDeepstashItems.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  This deepstash is empty.
                </p>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {viewDeepstashItems?.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-[#333]"
                    >
                      {item.isDirectory ? (
                        <Folder className="w-3.5 h-3.5 text-[#e5c07b] shrink-0" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-[#abb2bf] shrink-0" />
                      )}
                      <span className="truncate text-gray-300">{item.path}</span>
                    </div>
                  ))}
                </div>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button
                slot="close"
                variant="ghost"
                className="bg-transparent text-gray-300 hover:bg-[#333] text-xs"
              >
                Close
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  );
}
