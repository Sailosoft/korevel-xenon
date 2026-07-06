/**
 * BLChapterPreview - Chapter preview modal component.
 *
 * Single Responsibility: Display chapter content in a heroUI modal.
 * Uses react-markdown for rendering. No shadcn/ui or radix-ui.
 */

"use client";

import React from "react";
import { Modal, Button } from "@heroui/react";
import ReactMarkdown from "react-markdown";
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
    <Modal.Backdrop isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Modal.Container size="lg" scroll="inside">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading className="text-2xl md:text-3xl font-bold tracking-tight">
              {chapter &&
                `Chapter ${chapter.number}: ${chapter.title}`}
            </Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            {chapter && chapter.content ? (
              <div className="prose prose-lg dark:prose-invert max-w-none text-lg leading-relaxed space-y-4">
                <ReactMarkdown>
                  {chapter.content}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="flex items-center justify-center py-16 text-default-400">
                <p className="text-lg italic">
                  No content generated yet for this chapter.
                </p>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button slot="close" variant="secondary" onPress={onClose}>
              Close
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
};

export default BLChapterPreview;
