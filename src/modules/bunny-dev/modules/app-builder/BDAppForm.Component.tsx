"use client";

// BDAppForm.Component — form designer: edit the ordered field list of a
// resource's create/edit schema. When the resource is tied to a schema model,
// "Add field" opens a property picker — the picked property pre-fills the
// field (name, label, required, derived type) with a persisted schema link,
// and the field type stays fully adjustable afterwards.

import { useState } from "react";
import { Plus, RefreshCw, Trash2, Wand2 } from "lucide-react";
import type { BDAppField, BDSchemaModel } from "../../BDDomain.Types";
import {
  BD_APP_FIELD_TYPE_OPTIONS,
  fieldFromProperty,
  modelFieldOptions,
} from "./BDApp.Types";
import BDAppFieldSelect from "./BDAppFieldSelect.Component";
import BDAppModelDerive from "./BDAppModelDerive.Component";
import BDAppPropertyPicker from "./BDAppPropertyPicker.Component";
import BDButton from "../../components/BDButton";

export interface BDAppFormComponentProps {
  fields: BDAppField[];
  models: BDSchemaModel[];
  /**
   * The resource's tied schema model, when its schema/table are tied up. Its
   * properties become the candidates for "Add field".
   */
  model?: BDSchemaModel | null;
  projectId: string;
  onChange: (fields: BDAppField[]) => void;
}

const CELL =
  "rounded border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-blue-400";

export function BDAppFormComponent({
  fields,
  models,
  model,
  projectId,
  onChange,
}: BDAppFormComponentProps) {
  const [deriveOpen, setDeriveOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const update = (index: number, patch: Partial<BDAppField>) => {
    onChange(fields.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  };

  const deriveFromModel = (schemaModel: BDSchemaModel) => {
    onChange(schemaModel.properties.filter((p) => !p.primary).map(fieldFromProperty));
  };

  // When a schema model is tied to the resource, picking a property creates a
  // linked field instead of a blank one.
  const addField = () => {
    if (model) {
      setPickerOpen(true);
      return;
    }
    onChange([
      ...fields,
      { kind: "field", type: "text", name: `field_${fields.length + 1}` },
    ]);
  };

  return (
    <>
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">
            Form fields ({fields.length})
          </h3>
          <div className="flex items-center gap-2">
            <BDButton
              size="sm"
              variant="secondary"
              icon={Wand2}
              onClick={() => setDeriveOpen(true)}
            >
              Derive
            </BDButton>
            <BDButton
              size="sm"
              variant="secondary"
              icon={Plus}
              onClick={addField}
            >
              {model ? "Add from schema" : "Add field"}
            </BDButton>
          </div>
        </div>

        {fields.length === 0 ? (
          <p className="flex items-center gap-1 text-xs text-slate-400">
            <Wand2 className="h-3 w-3" />{" "}
            {model
              ? "No fields yet — add schema properties one by one, or derive them all at once."
              : "No fields yet — derive from a model or add manually."}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {fields.map((field, index) => {
              const linkedProperty = field.schemaPropertyName
                ? model?.properties.find(
                    (p) => p.name === field.schemaPropertyName,
                  )
                : undefined;
              return (
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
                      <BDAppFieldSelect
                        cell={`${CELL} w-40`}
                        placeholder="title attr (default: name)"
                        value={field.relation?.titleAttribute ?? ""}
                        options={
                          field.relation?.modelId
                            ? modelFieldOptions(
                                models.find(
                                  (m) => m.id === field.relation?.modelId,
                                ),
                              )
                            : []
                        }
                        onChange={(value) =>
                          update(index, {
                            relation: {
                              name: field.name,
                              modelId: field.relation?.modelId,
                              titleAttribute: value,
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

                  {linkedProperty && (
                    <span
                      className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600"
                      title={`Schema property: ${linkedProperty.name}`}
                    >
                      schema · {linkedProperty.type}
                    </span>
                  )}
                  {linkedProperty && (
                    <button
                      type="button"
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      title="Re-sync from schema property (resets name, label, required and type)"
                      onClick={() => update(index, fieldFromProperty(linkedProperty))}
                      aria-label="Re-sync from schema property"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                    onClick={() => onChange(fields.filter((_, i) => i !== index))}
                    aria-label="Remove field"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <BDAppModelDerive
        open={deriveOpen}
        onClose={() => setDeriveOpen(false)}
        projectId={projectId}
        kind="fields"
        onSelect={(schemaModel) => {
          deriveFromModel(schemaModel);
          setDeriveOpen(false);
        }}
      />

      <BDAppPropertyPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        model={model ?? null}
        excludeNames={fields.map((f) => f.schemaPropertyName ?? f.name)}
        onSelect={(property) =>
          onChange([...fields, fieldFromProperty(property)])
        }
      />
    </>
  );
}

export default BDAppFormComponent;
