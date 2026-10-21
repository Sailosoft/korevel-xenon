"use client";

// BDSchemaRelationColumn.Component — pick another model and add its foreign
// key column plus a belongsTo relation in one step.

import { useState } from "react";
import { Link2 } from "lucide-react";
import type { BDSchemaModel } from "../../BDDomain.Types";
import {
  buildRelationColumn,
  suggestRelationName,
} from "./BDSchemaBuilder.Types";
import BDModal from "../../components/BDModal";
import BDButton from "../../components/BDButton";
import BDEmptyState from "../../components/BDEmptyState";

export interface BDSchemaRelationColumnComponentProps {
  open: boolean;
  /** Model being edited (its draft values are used for the preview). */
  draft: BDSchemaModel;
  /** Other models in the same schema group. */
  models: BDSchemaModel[];
  onClose: () => void;
  onAdd: (target: BDSchemaModel) => void;
}

export function BDSchemaRelationColumnComponent({
  open,
  draft,
  models,
  onClose,
  onAdd,
}: BDSchemaRelationColumnComponentProps) {
  const [targetId, setTargetId] = useState("");

  // Default to the first other model whenever the popup opens.
  const modalKey = `${open}:${draft.id}`;
  const [prevKey, setPrevKey] = useState(modalKey);
  if (modalKey !== prevKey) {
    setPrevKey(modalKey);
    const first = models.find((model) => model.id !== draft.id) ?? models[0];
    setTargetId(first?.id ?? "");
  }

  const target = models.find((model) => model.id === targetId) ?? null;
  const preview = target ? buildRelationColumn(draft, target) : null;
  const inverseName = target
    ? suggestRelationName("hasMany", target.name) || "models"
    : "";

  return (
    <BDModal
      open={open}
      onClose={onClose}
      title="Add relation column"
      description="Adds a foreign key column and a belongsTo relation, then the inverse relation on the target model."
      size="md"
      footer={
        <>
          <BDButton variant="ghost" onClick={onClose}>
            Cancel
          </BDButton>
          <BDButton
            icon={Link2}
            disabled={!target || !preview}
            onClick={() => {
              if (target) onAdd(target);
            }}
          >
            Add relation column
          </BDButton>
        </>
      }
    >
      {models.length === 0 ? (
        <BDEmptyState
          title="No models to relate to"
          description="Add another model to this schema group first."
        />
      ) : (
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Target model</span>
            <select
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
              value={targetId}
              onChange={(event) => setTargetId(event.target.value)}
            >
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.id === draft.id
                    ? `${model.name || "Untitled model"} (this model)`
                    : model.name || "Untitled model"}
                </option>
              ))}
            </select>
          </label>

          {preview && target ? (
            <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <p>
                Column{" "}
                <code className="rounded bg-white px-1.5 py-0.5 font-medium text-slate-800">
                  {preview.property.name}
                </code>{" "}
                <span className="text-slate-400">{preview.property.type}</span>
              </p>
              <p>
                Relation{" "}
                <code className="rounded bg-white px-1.5 py-0.5 font-medium text-slate-800">
                  {preview.relation.name}
                </code>{" "}
                belongsTo {target.name || "target"}
              </p>
              <p>
                Also adds{" "}
                <code className="rounded bg-white px-1.5 py-0.5 font-medium text-slate-800">
                  {inverseName}
                </code>{" "}
                hasMany on {target.name || "the target"} after this model is
                saved.
              </p>
            </div>
          ) : (
            <p className="text-xs text-amber-600">
              The selected model has no columns to reference.
            </p>
          )}
        </div>
      )}
    </BDModal>
  );
}

export default BDSchemaRelationColumnComponent;
