"use client";

// BDProjectList.Component — the outer BunnyDev page: project CRUD.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderKanban, Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import { useBDProjects } from "./BDProject.Hooks";
import { bdProjectRepository } from "./BDProject.Repository";
import { deleteAppRecordsByProject } from "../../BDAppDatabase";
import {
  BD_PROJECT_EMPTY_FORM,
  toProjectForm,
  type BDProjectForm,
} from "./BDProject.Types";
import type { BDProject } from "../../BDDomain.Types";
import BDPageHeader from "../../components/BDPageHeader";
import BDButton from "../../components/BDButton";
import BDList from "../../components/BDList";
import BDModal from "../../components/BDModal";
import BDForm from "../../components/BDForm";
import BDConfirmDialog from "../../components/BDConfirmDialog";
import { useBDToast } from "../../components/BDToast";

const PROJECT_FIELDS = [
  {
    name: "key",
    label: "Key",
    type: "text" as const,
    required: true,
    placeholder: "e.g. BUNNY",
    helperText: "Short uppercase identifier.",
  },
  {
    name: "name",
    label: "Name",
    type: "text" as const,
    required: true,
    placeholder: "e.g. Bunny Commerce",
  },
  {
    name: "description",
    label: "Description",
    type: "textarea" as const,
    columnSpan: "full" as const,
    placeholder: "What is this project about?",
  },
];

export function BDProjectListComponent() {
  const router = useRouter();
  const projects = useBDProjects();
  const { toast } = useBDToast();

  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<BDProjectForm>(
    BD_PROJECT_EMPTY_FORM,
  );
  const [editing, setEditing] = useState<BDProject | null>(null);
  const [editForm, setEditForm] = useState<BDProjectForm>(BD_PROJECT_EMPTY_FORM);
  const [deleting, setDeleting] = useState<BDProject | null>(null);
  const [busy, setBusy] = useState(false);

  const handleCreate = async (values: Record<string, unknown>) => {
    const form = values as unknown as BDProjectForm;
    if (!form.key.trim() || !form.name.trim()) {
      toast({ title: "Key and name are required", status: "warning" });
      return;
    }
    setBusy(true);
    try {
      await bdProjectRepository.createProject(form);
      setCreating(false);
      setCreateForm(BD_PROJECT_EMPTY_FORM);
      toast({ title: "Project created", status: "success" });
    } catch (err) {
      toast({
        title: "Could not create project",
        description: err instanceof Error ? err.message : undefined,
        status: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleUpdate = async (values: Record<string, unknown>) => {
    if (!editing) return;
    setBusy(true);
    try {
      await bdProjectRepository.updateProject(
        editing.id,
        values as unknown as BDProjectForm,
      );
      setEditing(null);
      toast({ title: "Project updated", status: "success" });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await deleteAppRecordsByProject(deleting.id);
      await bdProjectRepository.delete(deleting.id);
      setDeleting(null);
      toast({
        title: "Project deleted",
        description: "All project-scoped data was removed.",
        status: "success",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <BDPageHeader
        icon={FolderKanban}
        title="Bunny Developer"
        description="Local-first workspace for designing schemas, apps, APIs, diagrams, docs, and the projects that hold them."
        actions={
          <BDButton
            icon={Plus}
            onClick={() => {
              setCreateForm(BD_PROJECT_EMPTY_FORM);
              setCreating(true);
            }}
          >
            New project
          </BDButton>
        }
      />

      <BDList<BDProject>
        data={projects ?? []}
        isLoading={projects === undefined}
        getRowId={(row) => row.id}
        searchable
        searchPlaceholder="Search projects…"
        getSearchText={(row) => `${row.key} ${row.name} ${row.description}`}
        emptyState={{
          icon: FolderKanban,
          title: "No projects yet",
          description:
            "Create your first project to start designing a schema, app, or API.",
          action: (
            <BDButton icon={Plus} onClick={() => setCreating(true)}>
              New project
            </BDButton>
          ),
        }}
        onRowClick={(row) =>
          router.push(`/modules/bunny-dev/projects/${row.id}`)
        }
        columns={[
          {
            key: "key",
            label: "Key",
            sortable: true,
            width: 120,
            render: (row) => (
              <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                {row.key}
              </span>
            ),
          },
          {
            key: "name",
            label: "Name",
            sortable: true,
            render: (row) => (
              <span className="font-medium text-slate-800">{row.name}</span>
            ),
          },
          {
            key: "description",
            label: "Description",
            render: (row) => (
              <span className="line-clamp-1 text-slate-500">
                {row.description || "—"}
              </span>
            ),
          },
          {
            key: "createdAt",
            label: "Created",
            sortable: true,
            width: 180,
            render: (row) =>
              row.createdAt
                ? new Date(row.createdAt).toLocaleString()
                : "—",
          },
        ]}
        rowActions={[
          {
            label: "Open",
            icon: ExternalLink,
            iconOnly: true,
            tooltip: "Open project",
            onSelect: ([row]) =>
              router.push(`/modules/bunny-dev/projects/${row.id}`),
          },
          {
            label: "Edit",
            icon: Pencil,
            iconOnly: true,
            tooltip: "Edit project",
            onSelect: ([row]) => {
              setEditForm(toProjectForm(row));
              setEditing(row);
            },
          },
          {
            label: "Delete",
            icon: Trash2,
            variant: "danger",
            iconOnly: true,
            tooltip: "Delete project",
            onSelect: ([row]) => setDeleting(row),
          },
        ]}
      />

      {/* Create */}
      <BDModal
        open={creating}
        onClose={() => setCreating(false)}
        title="New project"
        size="md"
      >
        <BDForm
          fields={PROJECT_FIELDS}
          value={createForm as unknown as Record<string, unknown>}
          onChange={(v) => setCreateForm(v as unknown as BDProjectForm)}
          onSubmit={handleCreate}
          onCancel={() => setCreating(false)}
          isLoading={busy}
          submitLabel="Create project"
        />
      </BDModal>

      {/* Edit */}
      <BDModal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={`Edit ${editing?.name ?? "project"}`}
        size="md"
      >
        <BDForm
          fields={PROJECT_FIELDS}
          value={editForm as unknown as Record<string, unknown>}
          onChange={(v) => setEditForm(v as unknown as BDProjectForm)}
          onSubmit={handleUpdate}
          onCancel={() => setEditing(null)}
          isLoading={busy}
          submitLabel="Save changes"
        />
      </BDModal>

      {/* Delete */}
      <BDConfirmDialog
        open={!!deleting}
        title={`Delete ${deleting?.name ?? "project"}?`}
        description="Every schema, app, diagram, outline, task, and file in this project will be permanently removed."
        confirmLabel="Delete project"
        isLoading={busy}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

export default BDProjectListComponent;
