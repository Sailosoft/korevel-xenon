"use client";

// BDApiDocument.Component — document-style API reference with HTML export.

import { Download } from "lucide-react";
import type { BDAPI, BDAPIProperty } from "../../BDDomain.Types";
import { BDAPIReturnKind } from "../../BDDomain.Types";
import { toApiDocumentHtml } from "./BDApiExport";
import BDBadge from "../../components/BDBadge";
import BDButton from "../../components/BDButton";
import BDEmptyState from "../../components/BDEmptyState";
import { downloadText, openTextTab } from "../../BDDownload";
import { BookText } from "lucide-react";

function ResponseFields({
  fields,
  label,
}: {
  fields: BDAPIProperty[];
  label: string;
}) {
  if (fields.length === 0) return null;
  return (
    <div className="mt-3">
      <h4 className="mb-1 text-xs font-semibold uppercase text-slate-400">
        {label}
      </h4>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead className="text-left text-slate-400">
            <tr>
              <th className="py-1 pr-3">Name</th>
              <th className="py-1 pr-3">Type</th>
              <th className="py-1 pr-3">Required</th>
              <th className="py-1">Description</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((p) => (
              <tr key={p.name} className="border-t border-slate-100">
                <td className="py-1 pr-3 font-medium text-slate-700">
                  {p.name}
                </td>
                <td className="py-1 pr-3 text-slate-500">{p.type}</td>
                <td className="py-1 pr-3 text-slate-500">
                  {p.required ? "yes" : "no"}
                </td>
                <td className="py-1 text-slate-500">{p.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export interface BDApiDocumentComponentProps {
  apis: BDAPI[];
  title?: string;
}

export function BDApiDocumentComponent({
  apis,
  title = "API Reference",
}: BDApiDocumentComponentProps) {
  if (apis.length === 0) {
    return (
      <BDEmptyState
        icon={BookText}
        title="Nothing to document"
        description="Add API operations to generate the document view."
      />
    );
  }

  const groups = apis.reduce<Record<string, BDAPI[]>>((acc, api) => {
    const key = api.group ?? "General";
    acc[key] = acc[key] ? [...acc[key], api] : [api];
    return acc;
  }, {});

  const handleExport = () => {
    const html = toApiDocumentHtml(apis, title);
    downloadText("api-reference.html", html, "text/html");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end gap-2">
        <BDButton
          size="sm"
          variant="secondary"
          onClick={() => openTextTab(toApiDocumentHtml(apis, title))}
        >
          Preview HTML
        </BDButton>
        <BDButton size="sm" icon={Download} onClick={handleExport}>
          Export HTML
        </BDButton>
      </div>

      <div className="flex flex-col gap-6 rounded-xl border border-slate-200 bg-white p-6">
        {Object.entries(groups).map(([group, groupApis]) => (
          <section key={group}>
            <h2 className="mb-3 text-lg font-bold text-blue-700">{group}</h2>
            <div className="flex flex-col gap-5">
              {groupApis.map((api) => (
                <article
                  key={api.id}
                  className="rounded-lg border border-slate-100 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-blue-600 px-2 py-0.5 text-xs font-bold uppercase text-white">
                      {api.method}
                    </span>
                    <code className="text-sm font-semibold text-slate-800">
                      {api.path}
                    </code>
                    {api.version && <BDBadge>v{api.version}</BDBadge>}
                    {api.deprecated && (
                      <BDBadge color="danger">deprecated</BDBadge>
                    )}
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-700">
                    {api.summary ?? api.name}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-500">
                    {api.description}
                  </p>

                  {api.properties.length > 0 && (
                    <div className="mt-3">
                      <h4 className="mb-1 text-xs font-semibold uppercase text-slate-400">
                        Parameters
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-xs">
                          <thead className="text-left text-slate-400">
                            <tr>
                              <th className="py-1 pr-3">Name</th>
                              <th className="py-1 pr-3">Type</th>
                              <th className="py-1 pr-3">In</th>
                              <th className="py-1 pr-3">Required</th>
                              <th className="py-1">Description</th>
                            </tr>
                          </thead>
                          <tbody>
                            {api.properties.map((p) => (
                              <tr
                                key={p.name}
                                className="border-t border-slate-100"
                              >
                                <td className="py-1 pr-3 font-medium text-slate-700">
                                  {p.name}
                                </td>
                                <td className="py-1 pr-3 text-slate-500">
                                  {p.type}
                                </td>
                                <td className="py-1 pr-3">
                                  <BDBadge>{p.location}</BDBadge>
                                </td>
                                <td className="py-1 pr-3 text-slate-500">
                                  {p.required ? "yes" : "no"}
                                </td>
                                <td className="py-1 text-slate-500">
                                  {p.description}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <p className="mt-3 text-xs text-slate-500">
                    Returns{" "}
                    <code className="rounded bg-slate-100 px-1">
                      {api.returns.type}
                    </code>{" "}
                    ({api.returns.kind})
                  </p>

                  <ResponseFields
                    fields={api.returns.properties ?? []}
                    label="Response fields"
                  />
                  {api.returns.item?.kind === BDAPIReturnKind.object && (
                    <ResponseFields
                      fields={api.returns.item.properties ?? []}
                      label="Response item"
                    />
                  )}

                  {api.errors && api.errors.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {api.errors.map((e) => (
                        <BDBadge key={`${e.status}-${e.message}`} color="danger">
                          {e.status} {e.message}
                        </BDBadge>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export default BDApiDocumentComponent;
