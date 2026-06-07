import { useBunnyKernel } from "@/src/modules/bunny/src/kernel";
import { Button, Modal } from "@heroui/react";
import { LoaderIcon, Rocket } from "lucide-react";
import { useCallback, useState, useEffect } from "react";
import { BUIBookRepository } from "./bui.book.repository";
import { BUIBookChapterRepository } from "./bui.book-chapter.repository";
import { buiChapterServerGenerate } from "./bui.book-chapter.server";
import { buiChapterPrompt, BUIChapterPromptType } from "./bui.book-chapter.prompt";
import { BUIBookEntity } from './bui.book.entity';

interface BUIBookChapterComponentGenerateProps {
  bookId: number;
}

export default function BUIBookChapterComponentGenerate({ bookId }: BUIBookChapterComponentGenerateProps) {
  const kernel = useBunnyKernel();
  const [bookData, setBookData] = useState<BUIBookEntity | null>(null);
  const [useAuthorProfile, setUseAuthorProfile] = useState(true);
  const [templateType, setTemplateType] = useState<BUIChapterPromptType>("default");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    async function loadContext() {
      try {
        const bookRepo = new BUIBookRepository();
        // Presumes book layout includes author profile object nesting structures
        const bookResponse = await bookRepo.panelGetOne(bookId);
        if (bookResponse) {
          setBookData(bookResponse);
        }
      } catch (error) {
        console.error("Failed loading configuration profiles:", error);
      }
    }
    if (bookId) loadContext();
  }, [bookId]);

  const handleGenerate = useCallback(async () => {
    if (!bookData) return;
    setIsGenerating(true);
    kernel.adminPanel.table.loadingOn();

    try {
      const response = await buiChapterServerGenerate(
        {
          book: bookData,
          author: bookData.author,
        },
        templateType,
        useAuthorProfile
      );

      // Raw array parse pipeline execution
      const generatedChapters = JSON.parse(response);
      const chapterRepo = new BUIBookChapterRepository();

      if (Array.isArray(generatedChapters)) {
        for (const item of generatedChapters) {
          await chapterRepo.panelCreate({
            bookId,
            number: item.number,
            title: item.title,
            description: item.description,
            status: "pending",
          });
        }
        // Force refresh core pipeline data table arrays
        kernel.adminPanel.table.refresh();
      }
    } catch (error) {
      console.error("Pipeline breakdown processing payload:", error);
    } finally {
      setIsGenerating(false);
      kernel.adminPanel.table.loadingOff();
    }
  }, [kernel, bookId, bookData, useAuthorProfile, templateType]);

  return (
    <Modal>
      <Button variant="secondary">
        <LoaderIcon />
        <span className="hidden sm:inline ml-1">
          {isGenerating ? "Generating Chapters..." : "Generate Chapters"}
        </span>
      </Button>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[460px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Icon className="bg-primary/10 text-primary">
                <Rocket className="size-5" />
              </Modal.Icon>
              <Modal.Heading>AI Chapter Builder Configuration</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-4">
              <p className="text-sm text-default-500">
                Configure execution parameters to populate missing structural modules.
              </p>

              <div className="flex flex-col gap-2 border-t pt-3 border-default-100">
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useAuthorProfile}
                    onChange={(e) => setUseAuthorProfile(e.target.checked)}
                    className="rounded border-default-300 accent-primary"
                  />
                  Align logic structure based on Author Profile
                </label>
              </div>

              <div className="flex flex-col gap-1 mt-2">
                <label className="text-xs font-semibold uppercase text-default-400">
                  Template Engine Style
                </label>
                <select
                  value={templateType}
                  onChange={(e) => setTemplateType(e.target.value as BUIChapterPromptType)}
                  className="w-full bg-default-100 p-2 rounded-md text-sm outline-none border border-transparent focus:border-primary"
                >
                  <option value="default">Standard Chronological Layout</option>
                  <option value="draft">Detailed Blueprint Engine</option>
                  <option value="three_act">Three-Act Narrative Blueprint</option>
                  <option value="hero_journey">The Hero Journey Archetype</option>
                  <option value="non_fiction">Modular Non-Fiction Blueprint</option>
                  <option value="sci_fi_world">Sci-Fi Worldbuilding Emphasis</option>
                  <option value="mystery_pacing">Mystery Suspense Arc Curves</option>
                </select>
              </div>

              <div className="mt-2 p-3 bg-default-50 border border-default-200 rounded-md">
                <span className="text-[10px] font-bold uppercase text-default-400 block mb-1">
                  Active Prompter Directives
                </span>
                <p className="text-xs text-default-600 italic">
                  {buiChapterPrompt.generateChapters[templateType]?.systemPrompt}
                </p>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button
                className="w-full"
                variant="outline"
                isDisabled={isGenerating || !bookData}
                onClick={handleGenerate}
              >
                {isGenerating ? "Processing Modules..." : "Confirm & Launch Engine"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}