"use client";

import { useEffect, useState } from "react";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import BFlowWorkflowGuidePanel from "./BFlowWorkflow.Guide.Panel";

/**
 * Custom event name used to toggle the YAML guide panel.
 * Dispatched by the modal header action button.
 */
export const BFLOW_TOGGLE_YAML_GUIDE_EVENT = "bflow:toggle-yaml-guide";

/**
 * Wraps the BunnyForm and the YAML structure guide panel.
 *
 * This component:
 * 1. Renders the BunnyForm fields inside the modal body.
 * 2. Shows a collapsible YAML structure guide panel below the form.
 * 3. Listens for a custom DOM event (`bflow:toggle-yaml-guide`) to toggle
 *    the guide visibility — triggered by the modal header dropdown action.
 *
 * The YAML generator populates form state directly via the modal header
 * action's `onClick` context, which accesses `adminPanel.form.handleChange`.
 *
 * @example
 * ```tsx
 * <Bunny config={bflowWorkflowModule}>
 *   <BFlowWorkflowModalBody />
 * </Bunny>
 * ```
 */
export default function BFlowWorkflowModalBody() {
  const [showGuide, setShowGuide] = useState(false);

  // Listen for toggle events from the modal header action
  useEffect(() => {
    const handler = () => setShowGuide((prev) => !prev);
    window.addEventListener(BFLOW_TOGGLE_YAML_GUIDE_EVENT, handler);
    return () =>
      window.removeEventListener(BFLOW_TOGGLE_YAML_GUIDE_EVENT, handler);
  }, []);

  return (
    <div className="space-y-4">
      {/* Guide panel — appears above the form when toggled */}
      <BFlowWorkflowGuidePanel
        show={showGuide}
        onClose={() => setShowGuide(false)}
      />

      {/* Standard form fields */}
      <BunnyForm />
    </div>
  );
}
