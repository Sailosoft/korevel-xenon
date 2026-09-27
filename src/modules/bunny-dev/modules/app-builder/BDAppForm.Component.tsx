"use client";

// BDAppForm.Component — form designer: edit the ordered field list of a
// resource's create/edit schema.

import { Plus, Trash2, Wand2 } from "lucide-react";
import type { BDAppField, BDSchemaModel } from "../../BDDomain.Types";
import { BD_APP_FIELD_TYPE_OPTIONS, fieldFromProperty } from "./BDApp.Types";
import BDButton from "../../components/BDButton";

export interface BDAppFormComponentProps {
  fields: BDAppField[];
  models: BDSchemaModel[];
  onChange: (fields: BDAppField[]) => void;
}

const CELL =
  "rounded border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-blue-400";

export function BDAppFormComponent({
  fields,
  models,
  onChange,
}: BDAppFormComponentProps) {
  const update = (index: number, patch: Partial<BDAppField>) => {
    onChange(fields.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  };

  const deriveFromModel = (modelId: string) => {
    const model = models.find((m) => m.id === modelId);
    if (!model) return;
    onChange(model.properties.filter((p) => !p.primary).map(fieldFromProperty));
  };

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">
          Form fields ({fields.length})
        </h3>
        <div className="flex items-center gap-2">
          <select
            className={CELL}
            value=""
            onChange={(e) => {
              if (e.target.value) deriveFromModel(e.target.value);
            }}
          >
            <option value="">Derive from model…</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <BDButton
            size="sm"
            variant="secondary"
            icon={Plus}
            onClick={() =>
              onChange([
                ...fields,
                { kind: "field", type: "text", name: `field_${fields.length + 1}` },
              ])
            }
          >
            Add field
          </BDButton>
        </div>
      </div>

      {fields.length === 0 ? (
        <p className="flex items-center gap-1 text-xs text-slate-400">
          <Wand2 className="h-3 w-3" /> No fields yet — derive from a model or add
          manually.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {fields.map((field, index) => (
            <div
              key={index}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 p-2"
            >
              <input
                className={`${CELL} w-36`}
                placeholder="name"
                value={field.name}
                onChange={(e) => update(index, { name: e.target.value })}
              />
              <input
                className={`${CELL} w-36`}
                placeholder="label"
                value={field.label ?? ""}
                onChange={(e) =>
                  update(index, { label: e.target.value || undefined })
                }
              />
              <select
                className={CELL}
                value={field.type}
                onChange={(e) =>
                  update(index, { type: e.target.value as BDAppField["type"] })
                }
              >
                {BD_APP_FIELD_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {field.type === "relationSelect" && (
                <>
                  <select
                    className={CELL}
                    value={field.relation?.modelId ?? ""}
                    onChange={(e) =>
                      update(index, {
                        relation: {
                          name: field.name,
                          titleAttribute:
                            field.relation?.titleAttribute ?? "name",
                          modelId: e.target.value || undefined,
                        },
                      })
                    }
                  >
                    <option value="">Related model…</option>
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  <input
                    className={`${CELL} w-28`}
                    placeholder="title attr"
                    value={field.relation?.titleAttribute ?? ""}
                    onChange={(e) =>
                      update(index, {
                        relation: {
                          name: field.name,
                          modelId: field.relation?.modelId,
                          titleAttribute: e.target.value,
                        },
                      })
                    }
                  />
                </>
              )}

              <label className="flex items-center gap-1 text-xs text-slate-500">
                <input
                  type="checkbox"
                  checked={!!field.required}
                  onChange={(e) =>
                    update(index, { required: e.target.checked })
                  }
                />
                required
              </label>

              <button
                type="button"
                className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                onClick={() => onChange(fields.filter((_, i) => i !== index))}
                aria-label="Remove field"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default BDAppFormComponent;
