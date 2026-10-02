"use client";

// BDProject.Component — the project overview dashboard.

import { useState } from "react";
import Link from "next/link";
import { Pencil, Star } from "lucide-react";
import { useBDProjectContext } from "./BDProject.Context";
import { useBDProjectStats } from "./BDProject.Hooks";
import { bdProjectRepository } from "./BDProject.Repository";
import { toProjectForm, type BDProjectForm } from "./BDProject.Types";
import { BD_PROJECT_MODULES } from "./BDProject.Module";
import BDPageHeader from "../../components/BDPageHeader";
import BDButton from "../../components/BDButton";
import BDModal from "../../components/BDModal";
import BDForm from "../../components/BDForm";
import BDEmptyState from "../../components/BDEmptyState";
import { useBDToast } from "../../components/BDToast";

export function BDProjectComponent() {
  const { projectId, project, isLoading, isMissing } = useBDProjectContext();
  const stats = useBDProjectStats(projectId);
  const { toast } = useBDToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<BDProjectForm>({
    key: "",
    name: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);

  if (isLoading) {
    return <div className="p-8 text-sm text-slate-500">Loading project…</div>;
  }

  if (isMissing || !project) {
    return (
      <BDEmptyState
        title="Project not found"
        description="This project may have been deleted."
        icon={Star}
      />
    );
  }

  const openEdit = () => {
    setForm(toProjectForm(project));
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await bdProjectRepository.updateProject(projectId, form);
      setEditing(false);
      toast({ title: "Project updated", status: "success" });
    } catch (err) {
      toast({
        title: "Update failed",
        description: err instanceof Error ? err.message : undefined,
        status: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const statCards: { label: string; value: number; key: string }[] = [
    { label: "Members", value: stats?.members ?? 0, key: "members" },
    { label: "Schema models", value: stats?.schemaModels ?? 0, key: "models" },
    { label: "Apps", value: stats?.apps ?? 0, key: "apps" },
    { label: "API specs", value: stats?.apiSpecs ?? 0, key: "api" },
    { label: "Diagrams", value: stats?.diagrams ?? 0, key: "diagrams" },
    { label: "Outlines", value: stats?.outlines ?? 0, key: "outlines" },
    {
      label: "Architectures",
      value: stats?.architectures ?? 0,
      key: "architectures",
    },
    { label: "Board tasks", value: stats?.boardTasks ?? 0, key: "tasks" },
    { label: "Agents", value: stats?.agents ?? 0, key: "agents" },
    { label: "Files", value: stats?.files ?? 0, key: "files" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <BDPageHeader
        icon={Star}
        title={project.name}
        description={project.description || "No description yet."}
        actions={
          <BDButton size="sm" variant="secondary" icon={Pencil} onClick={openEdit}>
            Edit project
          </BDButton>
        }
      />

      <div className="flex items-center gap-2">
        <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
          {project.key}
        </span>
        <span className="text-xs text-slate-400">
          {project.issueTypes?.length ?? 0} issue types
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {statCards.map((card) => (
          <div
            key={card.key}
            className="rounded-2xl border border-slate-200 bg-white p-4"
          >
            <p className="text-2xl font-bold text-slate-900">{card.value}</p>
            <p className="mt-0.5 text-xs text-slate-500">{card.label}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          Sub-modules
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BD_PROJECT_MODULES.map((mod) => (
            <Link
              key={mod.key}
              href={`/modules/bunny-dev/projects/${projectId}${mod.path}`}
              className="group flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-blue-300 hover:bg-blue-50/40"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-100">
                <mod.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {mod.label}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {mod.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <BDModal
        open={editing}
        onClose={() => setEditing(false)}
        title="Edit project"
        size="md"
      >
        <BDForm
          fields={[
            { name: "key", label: "Key", type: "text", required: true },
            { name: "name", label: "Name", type: "text", required: true },
            {
              name: "description",
              label: "Description",
              type: "textarea",
              columnSpan: "full",
            },
          ]}
          value={form as unknown as Record<string, unknown>}
          onChange={(v) => setForm(v as unknown as BDProjectForm)}
          onSubmit={handleSave}
          onCancel={() => setEditing(false)}
          isLoading={saving}
          submitLabel="Save changes"
        />
      </BDModal>
    </div>
  );
}

export default BDProjectComponent;
