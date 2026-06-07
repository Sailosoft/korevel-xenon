// bui.book-chapter.component.export-preview.tsx
import React, { useState, useEffect, useRef } from "react";
import { Button, Modal } from "@heroui/react";
import { Download, Eye, Settings2 } from "lucide-react";
import { BUIBookHTMLTemplate, BUIBookTemplateState } from "./bui.book.export.types";
import { BUIBookExportService } from "./bui.book.export.service";
import { BUI_AVAILABLE_BOOK_TEMPLATES } from "./bui.book.export.template";
import { buiBookExportDownload } from './bui.book.export.download';

interface ExportPreviewModalProps {
  bookId: number;
}

export default function BUIBookComponentExportPreview({
  bookId,
}: ExportPreviewModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTemplateName, setSelectedTemplateName] = useState("default");
  const [isAdvanced, setIsAdvanced] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Advanced granular part assignment state maps
  const [customParts, setCustomParts] = useState<BUIBookTemplateState>({
    documentShell: "default",
    sidebarContainer: "default",
    mainContentWrapper: "default",
    mainHeaderWrapper: "default",
    articleContainer: "default",
    sidebarLinkItem: "default",
    mainIndexLinkItem: "default",
    chapterHeader: "default",
    chapterBodyWrapper: "default",
    pageFooter: "default",
  });

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const exportService = new BUIBookExportService();

  // Assembles the composite template parameters dynamically matching selected dropdown choices
  const buildActiveTemplateConfig = (): BUIBookHTMLTemplate => {
    const baseTemplate =
      BUI_AVAILABLE_BOOK_TEMPLATES.find(
        (t) => t.name === selectedTemplateName,
      ) || BUI_AVAILABLE_BOOK_TEMPLATES[0];

    if (!isAdvanced) {
      return baseTemplate;
    }

    // Resolve advanced part references individually
    const resolvePart = (
      partKey: keyof typeof customParts,
      section: "layout" | "component",
    ) => {
      const sourceTemplateName = customParts[partKey];
      const sourceTemplate =
        BUI_AVAILABLE_BOOK_TEMPLATES.find(
          (t) => t.name === sourceTemplateName,
        ) || baseTemplate;
      const template = sourceTemplate[section];

      return (template as unknown as Record<string, string>)[partKey];
    };

    return {
      name: "custom_composite",
      globalAsset: baseTemplate.globalAsset,
      layout: {
        documentShell: resolvePart("documentShell", "layout"),
        sidebarContainer: resolvePart("sidebarContainer", "layout"),
        mainContentWrapper: resolvePart("mainContentWrapper", "layout"),
        mainHeaderWrapper: resolvePart("mainHeaderWrapper", "layout"),
        articleContainer: resolvePart("articleContainer", "layout"),
      },
      component: {
        sidebarLinkItem: resolvePart("sidebarLinkItem", "component"),
        mainIndexLinkItem: resolvePart("mainIndexLinkItem", "component"),
        chapterHeader: resolvePart("chapterHeader", "component"),
        chapterBodyWrapper: resolvePart("chapterBodyWrapper", "component"),
        pageFooter: resolvePart("pageFooter", "component"),
      },
    };
  };

  const updateLivePreview = async () => {
    if (!iframeRef.current) return;
    setPreviewLoading(true);
    try {
      const activeTemplate = buildActiveTemplateConfig();
      const compiledHtml = await exportService.exportByBookId(
        bookId,
        activeTemplate,
      );

      const doc =
        iframeRef.current.contentDocument ||
        iframeRef.current.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(compiledHtml);
        doc.close();
      }
    } catch (err) {
      console.error("Iframe compilation mapping stream failed:", err);
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateLivePreview();
    }
  }, [isOpen, selectedTemplateName, isAdvanced, customParts]);

  return (
    <>
      <Button
        onPress={() => setIsOpen(true)}
        size="sm"
        className="font-medium shadow-sm flex items-center gap-2"
      >
        <Eye className="w-4 h-4" /> Export & Preview
      </Button>

      <Modal isOpen={isOpen}>
        <Modal.Backdrop onClick={() => setIsOpen(false)}>
          <Modal.Container size="full">
            <Modal.Dialog
              className="h-[90vh] max-w-7xl flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <Modal.Header className="px-6 py-4 border-b border-default-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Compile Sandbox System
                  </h3>
                  <p className="text-xs text-default-400">
                    Configure layout engines and stream test compiled models
                    instantly inside a sandbox iframe layout context.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => setIsOpen(false)}
                >
                  Exit Monitor
                </Button>
              </Modal.Header>

              <Modal.Body className="flex-1 flex flex-col md:flex-row p-0 overflow-hidden divide-x divide-slate-100">
                {/* CONTROL PANEL */}
                <div className="w-full md:w-80 p-6 overflow-y-auto space-y-6 bg-slate-50/50">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Active Core Blueprint
                    </label>
                    <select
                      value={selectedTemplateName}
                      onChange={(e) => setSelectedTemplateName(e.target.value)}
                      className="w-full bg-white px-3 py-2 border-2 border-slate-200 rounded-xl text-sm outline-none focus:border-primary"
                    >
                      {BUI_AVAILABLE_BOOK_TEMPLATES.map((t) => (
                        <option key={t.name} value={t.name}>
                          {t.description || t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer p-2 hover:bg-slate-100 rounded-xl transition-colors">
                    <input
                      type="checkbox"
                      checked={isAdvanced}
                      onChange={(e) => setIsAdvanced(e.target.checked)}
                      className="rounded border-slate-300 accent-primary"
                    />
                    <Settings2 className="w-4 h-4 text-slate-500" /> Enable
                    Advanced Part Composition
                  </label>

                  {/* ADVANCED REPLACEMENT FIELDS SUBPANEL */}
                  {isAdvanced && (
                    <div className="space-y-3 pt-3 border-t border-dashed border-slate-200 animate-fadeIn">
                      <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase block mb-2">
                        Micro Part Overrides
                      </span>

                      {Object.keys(customParts).map((partKey) => (
                        <div key={partKey} className="flex flex-col gap-1">
                          <label className="text-[11px] font-medium text-slate-600 capitalize">
                            {partKey.replace(/([A-Z])/g, " $1")}
                          </label>
                          <select
                            value={(customParts as unknown as Record<string, string>)[partKey]}
                            onChange={(e) =>
                              setCustomParts((prev) => ({
                                ...prev,
                                [partKey]: e.target.value,
                              }))
                            }
                            className="w-full bg-white px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none"
                          >
                            {BUI_AVAILABLE_BOOK_TEMPLATES.map((t) => (
                              <option key={t.name} value={t.name}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* LIVE PREVIEW IFRAME SANDBOX VIEWPORT */}
                <div className="flex-1 flex flex-col bg-slate-900 p-4 relative">
                  <div className="absolute top-6 right-8 z-50 flex items-center gap-2">
                    {previewLoading && (
                      <span className="text-xs text-white/60 bg-black/40 px-3 py-1.5 rounded-full animate-pulse">
                        Re-rendering...
                      </span>
                    )}
                    <Button
                      size="sm"
                      variant="primary"
                      className="font-semibold shadow-md flex items-center gap-2 text-white bg-emerald-600 hover:bg-emerald-700"
                      onClick={() =>
                        buiBookExportDownload(
                          bookId,
                          buildActiveTemplateConfig(),
                        )
                      }
                    >
                      <Download className="w-4 h-4" /> Download Compiled HTML
                    </Button>
                  </div>
                  <iframe
                    ref={iframeRef}
                    title="Live Compiled Context Showcase"
                    className="w-full h-full bg-white rounded-xl shadow-inner border-0"
                  />
                </div>
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}
