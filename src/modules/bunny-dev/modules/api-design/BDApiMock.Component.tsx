"use client";

// BDApiMock.Component — Postman-like request/response mocking for one API.
//
// No network calls: the mock request is built from the API's body parameters
// and the mocked response from its return definition.

import { useMemo, useState } from "react";
import { Send, Braces } from "lucide-react";
import type { BDAPI } from "../../BDDomain.Types";
import {
  BD_API_LOCATION_OPTIONS,
  buildMockRequest,
  buildMockResponse,
} from "./BDApi.Types";
import BDCodeEditor from "../../components/BDCodeEditor";
import BDButton from "../../components/BDButton";
import BDBadge from "../../components/BDBadge";

export interface BDApiMockComponentProps {
  api: BDAPI;
}

type MockTab = "params" | "headers" | "body";

export function BDApiMockComponent({ api }: BDApiMockComponentProps) {
  const [tab, setTab] = useState<MockTab>("params");
  const [sent, setSent] = useState(false);

  const request = useMemo(() => buildMockRequest(api), [api]);
  const response = useMemo(() => buildMockResponse(api), [api]);

  const params = api.properties.filter(
    (p) => p.location === "query" || p.location === "path",
  );
  const headers = api.properties.filter(
    (p) => p.location === "header" || p.location === "cookie",
  );
  const body = api.properties.filter(
    (p) => p.location === "body" || p.location === "formData" || p.location === "field",
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Request bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <span className="rounded-md bg-blue-600 px-2 py-1 text-xs font-bold uppercase text-white">
          {api.method}
        </span>
        <input
          readOnly
          value={api.url ?? api.path}
          className="min-w-[12rem] flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-xs text-slate-600"
        />
        <BDButton size="sm" icon={Send} onClick={() => setSent(true)}>
          Send
        </BDButton>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Request */}
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-2 flex gap-2">
            {(
              [
                ["params", `Params (${params.length})`],
                ["headers", `Headers (${headers.length})`],
                ["body", `Body (${body.length})`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`rounded-lg px-2.5 py-1 text-xs ${
                  tab === key
                    ? "bg-blue-100 font-semibold text-blue-700"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "body" ? (
            <BDCodeEditor
              value={JSON.stringify(request, null, 2)}
              language="json"
              readOnly
              height={220}
            />
          ) : (
            <div className="flex flex-col gap-1">
              {(tab === "params" ? params : headers).length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">
                  None.
                </p>
              ) : (
                (tab === "params" ? params : headers).map((p) => (
                  <div
                    key={p.name}
                    className="flex items-center gap-2 rounded-lg border border-slate-100 px-2 py-1.5 text-xs"
                  >
                    <span className="font-medium text-slate-700">
                      {p.name}
                    </span>
                    <BDBadge>{p.location}</BDBadge>
                    <span className="text-slate-400">{p.type}</span>
                    <span className="flex-1 truncate text-slate-500">
                      {p.description}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {api.headers && api.headers.length > 0 && (
            <div className="mt-2 border-t border-slate-100 pt-2">
              {api.headers.map((h) => (
                <div key={h.name} className="text-[11px] text-slate-500">
                  <span className="font-mono">{h.name}</span>: {h.type}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Response */}
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">
              Response
            </span>
            {sent && (
              <BDBadge color="success">
                {api.returns.status ?? 200} · {api.returns.kind}
              </BDBadge>
            )}
          </div>
          {sent ? (
            <BDCodeEditor
              value={JSON.stringify(response, null, 2)}
              language="json"
              readOnly
              height={220}
            />
          ) : (
            <div className="flex min-h-[120px] flex-col items-center justify-center gap-1 text-slate-400">
              <Braces className="h-5 w-5" />
              <p className="text-xs">Press Send to preview the mocked response.</p>
            </div>
          )}
        </div>
      </div>

      {/* Location legend */}
      <div className="flex flex-wrap gap-1.5">
        {BD_API_LOCATION_OPTIONS.map((opt) => (
          <BDBadge key={opt.value} color="gray">
            {opt.label}
          </BDBadge>
        ))}
      </div>
    </div>
  );
}

export default BDApiMockComponent;
