/**
 * BLChapterPreview - Chapter preview modal component.
 *
 * Single Responsibility: Display chapter content in a heroUI modal with rich markdown rendering.
 * Uses react-markdown with remarkGfm for GitHub-flavored markdown.
 * No shadcn/ui or radix-ui.
 */

"use client";

import React from "react";
import { Modal, Button } from "@heroui/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { X, BookOpen } from "lucide-react";
import type { IBLChapter } from "../core/BLEntity";

export interface IBLChapterPreviewProps {
  chapter: IBLChapter | null;
  onClose: () => void;
}

export const BLChapterPreview: React.FC<IBLChapterPreviewProps> = ({
  chapter,
  onClose,
}) => {
  const isOpen = !!chapter;

  return (
    <Modal.Backdrop
      isOpen={isOpen}
      onOpenChange={(open) => { if (!open) onClose(); }}
      className="z-50"
    >
      <Modal.Container
        size="cover"
        scroll="inside"
        className="sm:mx-4 sm:my-8 max-h-screen sm:max-h-[90vh] max-w-7xl mx-auto w-full"
      >
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header className="border-b border-[lab(44.7267%_-21.5987_-26.118_/_0.15)] pb-4">
            <div className="flex items-center gap-3 pr-8">
              <div className="p-1.5 rounded-lg bg-[lab(44.7267%_-21.5987_-26.118_/_0.1)] flex-shrink-0">
                <BookOpen className="w-5 h-5 text-[lab(44.7267%_-21.5987_-26.118)]" />
              </div>
              <Modal.Heading className="text-lg sm:text-2xl md:text-3xl font-bold tracking-tight text-[lab(44.7267%_-21.5987_-26.118)]">
                {chapter &&
                  `Chapter ${chapter.number}: ${chapter.title}`}
              </Modal.Heading>
            </div>
          </Modal.Header>
          <Modal.Body className="px-3 sm:px-6 py-4 sm:py-6">
            {chapter && chapter.content ? (
              <div className="text-[#1a1a1a] text-sm leading-relaxed">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => (
                      <h1 className="text-xl font-bold text-[lab(44.7267%_-21.5987_-26.118)] mt-6 mb-3 pb-1 border-b border-[#e0e0e0]">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-lg font-bold text-[lab(44.7267%_-21.5987_-26.118)] mt-5 mb-2">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-base font-semibold text-[#1a1a1a] mt-4 mb-1">
                        {children}
                      </h3>
                    ),
                    h4: ({ children }) => (
                      <h4 className="text-sm font-semibold text-[#1a1a1a] mt-3 mb-1">
                        {children}
                      </h4>
                    ),
                    p: ({ children }) => (
                      <p className="my-2 text-[#1a1a1a]">{children}</p>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc pl-4 sm:pl-6 my-2 text-[#1a1a1a] space-y-1">{children}</ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal pl-4 sm:pl-6 my-2 text-[#1a1a1a] space-y-1">{children}</ol>
                    ),
                    code: ({ className, children, ...props }) => {
                      const isInline = !className;
                      return isInline ? (
                        <code className="bg-[#f0f0f0] text-[#e06c75] px-1.5 py-0.5 rounded text-xs font-mono" {...props}>
                          {children}
                        </code>
                      ) : (
                        <code className="block bg-[#f8f8f8] text-[#1a1a1a] p-3 sm:p-4 rounded-lg text-xs font-mono overflow-x-auto my-3 border border-[#e0e0e0]" {...props}>
                          {children}
                        </code>
                      );
                    },
                    pre: ({ children }) => (
                      <pre className="bg-transparent p-0 m-0 overflow-x-auto">{children}</pre>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-[lab(44.7267%_-21.5987_-26.118)] pl-3 sm:pl-4 my-3 italic text-[#666666]">
                        {children}
                      </blockquote>
                    ),
                    a: ({ href, children }) => (
                      <a href={href} className="text-[lab(65%_-18_-22)] hover:underline hover:text-[lab(44.7267%_-21.5987_-26.118)] transition-colors" target="_blank" rel="noopener noreferrer">
                        {children}
                      </a>
                    ),
                    hr: () => <hr className="border-[#e0e0e0] my-4" />,
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-3">
                        <table className="min-w-full border-collapse border border-[#e0e0e0] text-xs sm:text-sm">
                          {children}
                        </table>
                      </div>
                    ),
                    th: ({ children }) => (
                      <th className="border border-[#e0e0e0] bg-[#f5f5f5] text-[lab(44.7267%_-21.5987_-26.118)] px-2 sm:px-3 py-1.5 font-semibold text-left">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="border border-[#e0e0e0] px-2 sm:px-3 py-1.5 text-[#1a1a1a]">
                        {children}
                      </td>
                    ),
                    img: ({ src, alt }) => (
                      <img src={src} alt={alt || ""} className="max-w-full rounded-lg my-3" />
                    ),
                  }}
                >
                  {chapter.content}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-default-400">
                <BookOpen className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-base sm:text-lg italic">
                  No content generated yet for this chapter.
                </p>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer className="border-t border-[lab(44.7267%_-21.5987_-26.118_/_0.1)] pt-4">
            <Button
              slot="close"
              variant="secondary"
              onPress={onClose}
              className="w-full sm:w-auto"
            >
              <X className="w-4 h-4 mr-1" />
              Close
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
};

export default BLChapterPreview;
