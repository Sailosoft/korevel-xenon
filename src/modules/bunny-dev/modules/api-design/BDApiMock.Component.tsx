"use client";

// BDApiMock.Component — Postman-like request/response mocking for one API.
//
// No network calls: the mock request is built from the API's body parameters
// and the mocked response from its return definition. Each fakeable field can
// pick a faker generator ("fake as") and the whole mock can be regenerated.

import { useMemo, useState } from "react";
import { Send, Braces, RefreshCw } from "lucide-react";
import type { BDAPI } from "../../BDDomain.Types";
import {
  BD_API_FAKE_TYPE_OPTIONS,
  BD_API_LOCATION_OPTIONS,
  buildMockRequest,
  buildMockResponse,
  isFakeableType,
} from "./BDApi.Types";
import BDCodeEditor from "../../components/BDCodeEditor";
import BDButton from "../../components/BDButton";
import BDBadge from "../../components/BDBadge";

export interface BDApiMockComponentProps {
  api: BDAPI;
  /** Persist edits back to the draft operation. */
  onUpdate?: (patch: Partial<BDAPI>) => void;
}

type MockTab = "params" | "headers" | "body";

const FAKE_SELECT_CLASS =
  "rounded border border-slate-200 bg-white px-1.5 py-1 text-xs outline-none focus:border-blue-400";

export function BDApiMockComponent({ api, onUpdate }: BDApiMockComponentProps) {
  const [tab, setTab] = useState<MockTab>("params");
  const [sent, setSent] = useState(false);
  const [generation, setGeneration] = useState(0);

  const request = useMemo(() => {
    void generation;
    return buildMockRequest(api);
  }, [api, generation]);
  const response = useMemo(() => {
    void generation;
    return buildMockResponse(api);
  }, [api, generation]);

  const indexed = api.properties.map((property, index) => ({ property, index }));
  const params = indexed.filter(
    ({ property }) => property.location === "query" || property.location === "path",
  );
  const headers = indexed.filter(
    ({ property }) => property.location === "header" || property.location === "cookie",
  );
  const body = indexed.filter(
    ({ property }) =>
      property.location === "body" ||
      property.location === "formData" ||
      property.location === "field",
  );

  const returnFields = api.returns.properties ?? [];
  const item = api.returns.item;
  const itemFields = item?.properties ?? [];

  const regenerate = () => {
    setGeneration((g) => g + 1);
    setSent(false);
  };

  const setParamFakeType = (index: number, fakeType: string) => {
    onUpdate?.({
      properties: api.properties.map((p, i) =>
        i === index ? { ...p, fakeType: fakeType || undefined } : p,
      ),
    });
  };

  const setReturnFakeType = (index: number, fakeType: string) => {
    onUpdate?.({
      returns: {
        ...api.returns,
        properties: returnFields.map((p, i) =>
          i === index ? { ...p, fakeType: fakeType || undefined } : p,
        ),
      },
    });
  };

  const setItemFakeType = (index: number, fakeType: string) => {
    if (!item) return;
    onUpdate?.({
      returns: {
        ...api.returns,
        item: {
          ...item,
          properties: itemFields.map((p, i) =>
            i === index ? { ...p, fakeType: fakeType || undefined } : p,
          ),
        },
      },
    });
  };

  const setReturnScalarFakeType = (fakeType: string) => {
    onUpdate?.({
      returns: { ...api.returns, fakeType: fakeType || undefined },
    });
  };

  const setItemScalarFakeType = (fakeType: string) => {
    if (!item) return;
    onUpdate?.({
      returns: {
        ...api.returns,
        item: { ...item, fakeType: fakeType || undefined },
      },
    });
  };

  const renderFakeSelect = (
    type: string,
    fakeType: string | undefined,
    label: string,
    onChange: (value: string) => void,
  ) =>
    isFakeableType(type) ? (
      <select
        className={FAKE_SELECT_CLASS}
        value={fakeType ?? ""}
        aria-label={`Fake generator for ${label}`}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onChange(e.target.value)}
      >
        {BD_API_FAKE_TYPE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    ) : null;

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
        <BDButton
          size="sm"
          variant="secondary"
          icon={RefreshCw}
          onClick={regenerate}
        >
          Regenerate
        </BDButton>
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
            <div className="flex flex-col gap-2">
              {body.length > 0 && (
                <div className="flex flex-col gap-1">
                  {body.map(({ property, index }) => (
                    <div
                      key={`${property.name}-${index}`}
                      className="flex items-center gap-2 rounded-lg border border-slate-100 px-2 py-1.5 text-xs"
                    >
                      <span className="font-medium text-slate-700">
                        {property.name}
                      </span>
                      <BDBadge>{property.location}</BDBadge>
                      <span className="text-slate-400">{property.type}</span>
                      <span className="ml-auto">
                        {renderFakeSelect(
                          property.type,
                          property.fakeType,
                          property.name,
                          (value) => setParamFakeType(index, value),
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <BDCodeEditor
                value={JSON.stringify(request, null, 2)}
                language="json"
                readOnly
                height={220}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {(tab === "params" ? params : headers).length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">
                  None.
                </p>
              ) : (
                (tab === "params" ? params : headers).map(
                  ({ property, index }) => (
                    <div
                      key={`${property.name}-${index}`}
                      className="flex items-center gap-2 rounded-lg border border-slate-100 px-2 py-1.5 text-xs"
                    >
                      <span className="font-medium text-slate-700">
                        {property.name}
                      </span>
                      <BDBadge>{property.location}</BDBadge>
                      <span className="text-slate-400">{property.type}</span>
                      <span className="flex-1 truncate text-slate-500">
                        {property.description}
                      </span>
                      {tab === "params" &&
                        renderFakeSelect(
                          property.type,
                          property.fakeType,
                          property.name,
                          (value) => setParamFakeType(index, value),
                        )}
                    </div>
                  ),
                )
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

          {returnFields.length > 0 && (
            <div className="mb-2 flex flex-col gap-1">
              {returnFields.map((property, index) => (
                <div
                  key={`${property.name}-${index}`}
                  className="flex items-center gap-2 rounded-lg border border-slate-100 px-2 py-1.5 text-xs"
                >
                  <span className="font-medium text-slate-700">
                    {property.name}
                  </span>
                  <span className="text-slate-400">{property.type}</span>
                  <span className="ml-auto">
                    {renderFakeSelect(
                      property.type,
                      property.fakeType,
                      property.name,
                      (value) => setReturnFakeType(index, value),
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}

          {itemFields.length > 0 && (
            <div className="mb-2 flex flex-col gap-1">
              <span className="text-[11px] font-medium text-slate-400">
                Array item fields
              </span>
              {itemFields.map((property, index) => (
                <div
                  key={`${property.name}-${index}`}
                  className="flex items-center gap-2 rounded-lg border border-slate-100 px-2 py-1.5 text-xs"
                >
                  <span className="font-medium text-slate-700">
                    {property.name}
                  </span>
                  <span className="text-slate-400">{property.type}</span>
                  <span className="ml-auto">
                    {renderFakeSelect(
                      property.type,
                      property.fakeType,
                      property.name,
                      (value) => setItemFakeType(index, value),
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}

          {returnFields.length === 0 &&
            api.returns.kind !== "array" &&
            isFakeableType(api.returns.type) && (
            <div className="mb-2 flex items-center gap-2 rounded-lg border border-slate-100 px-2 py-1.5 text-xs">
              <span className="font-medium text-slate-700">Return</span>
              <span className="text-slate-400">{api.returns.type}</span>
              <span className="ml-auto">
                {renderFakeSelect(
                  api.returns.type,
                  api.returns.fakeType,
                  "return value",
                  setReturnScalarFakeType,
                )}
              </span>
            </div>
          )}

          {item && itemFields.length === 0 && isFakeableType(item.type) && (
            <div className="mb-2 flex items-center gap-2 rounded-lg border border-slate-100 px-2 py-1.5 text-xs">
              <span className="font-medium text-slate-700">Array item</span>
              <span className="text-slate-400">{item.type}</span>
              <span className="ml-auto">
                {renderFakeSelect(
                  item.type,
                  item.fakeType,
                  "array item",
                  setItemScalarFakeType,
                )}
              </span>
            </div>
          )}

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
