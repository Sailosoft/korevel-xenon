"use client";

// BDGroupList — page-1 list of a feature's groups.
//
// Renders the feature header (with an optional extra action such as AI
// Generate) and a table of groups, each row offering Open / Rename / Delete.

import { useRouter } from "next/navigation";
import {
  ExternalLink,
  Pencil,
  Plus,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import BDPageHeader from "./BDPageHeader";
import BDButton from "./BDButton";
import BDList from "./BDList";
import BDBadge from "./BDBadge";

export interface BDGroupListProps<
  TGroup extends { id: string; name: string; description?: string },
> {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Label for the primary "create group" button, e.g. "New group". */
  newLabel: string;
  groups: TGroup[] | undefined;
  /** Noun for the per-group child count, e.g. "models". */
  countNoun: string;
  countFor: (group: TGroup) => number;
  /** Deep-route href for a group. */
  hrefFor: (group: TGroup) => string;
  /** Extra header actions rendered before the create button. */
  headerActions?: React.ReactNode;
  onNew: () => void;
  onEdit: (group: TGroup) => void;
  onDelete: (group: TGroup) => void;
}

export function BDGroupList<
  TGroup extends { id: string; name: string; description?: string },
>({
  icon,
  title,
  description,
  newLabel,
  groups,
  countNoun,
  countFor,
  hrefFor,
  headerActions,
  onNew,
  onEdit,
  onDelete,
}: BDGroupListProps<TGroup>) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-5">
      <BDPageHeader
        icon={icon}
        title={title}
        description={description}
        actions={
          <>
            {headerActions}
            <BDButton icon={Plus} onClick={onNew}>
              {newLabel}
            </BDButton>
          </>
        }
      />

      <BDList<TGroup>
        title="Groups"
        data={groups ?? []}
        isLoading={groups === undefined}
        getRowId={(row) => row.id}
        searchable
        getSearchText={(row) => `${row.name} ${row.description ?? ""}`}
        emptyState={{
          title: "No groups yet",
          description: "Create a group to get started.",
        }}
        onRowClick={(row) => router.push(hrefFor(row))}
        columns={[
          {
            key: "name",
            label: "Group",
            render: (row) => (
              <div>
                <span className="font-medium text-slate-800">{row.name}</span>
                {row.description ? (
                  <p className="mt-0.5 text-xs text-slate-400">
                    {row.description}
                  </p>
                ) : null}
              </div>
            ),
          },
          {
            key: "count",
            label: countNoun,
            width: 120,
            render: (row) => <BDBadge>{countFor(row)}</BDBadge>,
          },
        ]}
        rowActions={[
          {
            label: "Open",
            icon: ExternalLink,
            iconOnly: true,
            tooltip: "Open group",
            onSelect: ([row]) => router.push(hrefFor(row)),
          },
          {
            label: "Rename",
            icon: Pencil,
            iconOnly: true,
            tooltip: "Rename group",
            onSelect: ([row]) => onEdit(row),
          },
          {
            label: "Delete",
            icon: Trash2,
            variant: "danger",
            iconOnly: true,
            tooltip: "Delete group",
            onSelect: ([row]) => onDelete(row),
          },
        ]}
      />
    </div>
  );
}

export default BDGroupList;
