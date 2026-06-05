import { useBunnyKernel } from "@/src/modules/bunny/src/kernel";
import { Button, Modal } from "@heroui/react";
import { Rocket } from "lucide-react";
import { useCallback, useState } from "react";

export default function BUIBookChapterComponentGenerate() {
  const kernel = useBunnyKernel();
  const [useMetaData, setUseMetaData] = useState(true);
  const [useAuthorProfile, setUseAuthorProfile] = useState(true);
  const [templateType, setTemplateType] = useState("standard");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    kernel.adminPanel.table.loadingOn();

    try {
      // Logic placeholder for running batch generation or setup
      console.log("Generating chapters with configurations:", {
        useMetaData,
        useAuthorProfile,
        templateType,
      });

      // Simulate pipeline generation activity execution
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // kernel.adminPanel.table.;
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
      kernel.adminPanel.table.loadingOff();
    }
  }, [kernel, useMetaData, useAuthorProfile, templateType]);

  return (
    <Modal>
      <Button variant="secondary">
        {isGenerating ? "Generating Chapters..." : "Generate Chapters"}
      </Button>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[420px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Icon className="bg-primary/10 text-primary">
                <Rocket className="size-5" />
              </Modal.Icon>
              <Modal.Heading>AI Chapter Builder Configuration</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-4">
              <p className="text-sm text-default-500">
                Configure your generation rules step-by-step before provisioning
                new framework placeholders.
              </p>

              <div className="flex flex-col gap-2 border-t pt-3 border-default-100">
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useMetaData}
                    onChange={(e) => setUseMetaData(e.target.checked)}
                    className="rounded border-default-300 accent-primary"
                  />
                  Fill chapters based on Book Meta Data
                </label>

                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useAuthorProfile}
                    onChange={(e) => setUseAuthorProfile(e.target.checked)}
                    className="rounded border-default-300 accent-primary"
                  />
                  Align logic structure base on Author Profile
                </label>
              </div>

              <div className="flex flex-col gap-1 mt-2">
                <label className="text-xs font-semibold uppercase text-default-400">
                  Template Engine Style
                </label>
                <select
                  value={templateType}
                  onChange={(e) => setTemplateType(e.target.value)}
                  className="w-full bg-default-100 p-2 rounded-md text-sm outline-none border border-transparent focus:border-primary"
                >
                  <option value="standard">
                    Standard Chronological Breakdown
                  </option>
                  <option value="three_act">
                    Three-Act Structure Narrative
                  </option>
                  <option value="hero_journey">
                    The Hero's Journey Archetype
                  </option>
                  <option value="non_fiction">
                    Modular Non-Fiction / Educational
                  </option>
                </select>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button
                className="w-full"
                // color="primary"
                variant="outline"
                isDisabled={isGenerating}
                onClick={handleGenerate}
              >
                {isGenerating
                  ? "Processing Outline Modules..."
                  : "Confirm & Launch Engine"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
