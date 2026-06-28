"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Modal, Button } from "@heroui/react";
import {
  BunnyHeaderAction,
  BunnyHeaderVariants,
} from "./BunnyHeader.Interface";
import { useBunnyKernel } from "../kernel";
import { BunnyKernel } from "../Bunny.Interface";
import { BunnyFormBuilder } from "../form/builder/BunnyFormBuilder";
import {
  BunnyFormConfig,
  BunnyFormField,
} from "../form/BunnyForm.Interface";

// ── Types ──────────────────────────────────────────────────────────────────

/** Tracks the lifecycle of a header action form submission. */
export interface BunnyHeaderActionFormState<TData = unknown> {
  /** Current execution phase */
  type: "idle" | "processing" | "success" | "error";
  /** Optional progress message (e.g. "Writing chapter 4/10") */
  progress?: string;
  /** Error message if type is "error" */
  errorMessage?: string;
  /** Arbitrary data payload managed outside the form fields */
  data: TData;
}

/** Context passed to the submit action handler. */
export interface BunnyHeaderActionFormSubmitContext<
  TForm,
  TData = unknown,
> {
  formData: TForm;
  state: BunnyHeaderActionFormState<TData>;
  kernel: BunnyKernel<unknown, unknown>;
  /**
   * Update the execution state mid-flight.
   * Useful for reporting progress during a chain of server actions.
   */
  setState: (
    updater: (
      prev: BunnyHeaderActionFormState<TData>,
    ) => BunnyHeaderActionFormState<TData>,
  ) => void;
}

/** Context passed to the button label resolver. */
export interface BunnyHeaderActionFormButtonContext<TForm, TData = unknown> {
  formData: TForm;
  loading: boolean;
  state: BunnyHeaderActionFormState<TData>;
}

/** Resolved configuration for a header action form. */
export interface BunnyHeaderActionFormConfig<TForm, TData = unknown> {
  id: string;
  label?: string;
  icon?: React.ReactNode;
  variant?: BunnyHeaderVariants;
  initialData?: Partial<TForm>;
  formFields?: BunnyFormField<TForm>[];
  formConfig?: Partial<Omit<BunnyFormConfig<TForm>, "fields">>;
  initialDataPayload?: TData;
  buttonLabel?: (
    context: BunnyHeaderActionFormButtonContext<TForm, TData>,
  ) => string;
  submitAction?: (
    context: BunnyHeaderActionFormSubmitContext<TForm, TData>,
  ) => Promise<void>;
  /** Title shown in the modal header. Defaults to the header action label. */
  modalTitle?: string;
  /** Custom label for the submit button inside the modal. Defaults to the resolved button label. */
  submitLabel?: string;
  /** Label for the cancel button. Defaults to "Cancel". */
  cancelLabel?: string;
}

// ── Builder ────────────────────────────────────────────────────────────────

export class BunnyHeaderActionFormBuilder<TForm, TData = unknown> {
  private config: BunnyHeaderActionFormConfig<TForm, TData>;

  constructor(id: string) {
    this.config = {
      id,
      initialData: {} as Partial<TForm>,
      formFields: [],
      initialDataPayload: undefined as unknown as TData,
      buttonLabel: () => "Submit",
    };
  }

  /**
   * Set the initial form data used to pre-populate fields.
   */
  setInitialData(data: Partial<TForm>): this {
    this.config.initialData = data;
    return this;
  }

  /**
   * Define the form fields rendered by BunnyFormBuilder.
   *
   * @param fields - Array of BunnyFormField definitions.
   * @param formConfig - Optional grid cols, submit label overrides.
   */
  setForm(
    fields: BunnyFormField<TForm>[],
    formConfig?: Partial<Omit<BunnyFormConfig<TForm>, "fields">>,
  ): this {
    this.config.formFields = fields;
    if (formConfig) {
      this.config.formConfig = formConfig;
    }
    return this;
  }

  /**
   * Provide an arbitrary data payload outside of the form schema.
   * Useful for passing runtime context (counts, IDs, etc.) to the submit action.
   */
  data(initialData: TData): this {
    this.config.initialDataPayload = initialData;
    return this;
  }

  /**
   * Set a dynamic button label resolver.
   * Receives the current form data, loading state, and action state.
   */
  setButtonLabel(
    fn: (context: BunnyHeaderActionFormButtonContext<TForm, TData>) => string,
  ): this {
    this.config.buttonLabel = fn;
    return this;
  }

  /**
   * Set the submit action handler.
   * This is where you define the server action chain.
   * Use `setState` within to report progress for long-running operations.
   */
  setSubmitAction(
    fn: (
      context: BunnyHeaderActionFormSubmitContext<TForm, TData>,
    ) => Promise<void>,
  ): this {
    this.config.submitAction = fn;
    return this;
  }

  /** Set the header action button variant. */
  setVariant(variant: BunnyHeaderVariants): this {
    this.config.variant = variant;
    return this;
  }

  /** Set the header action button icon. */
  setIcon(icon: React.ReactNode): this {
    this.config.icon = icon;
    return this;
  }

  /** Set the header action button label. */
  setLabel(label: string): this {
    this.config.label = label;
    return this;
  }

  /** Set the modal title (defaults to the action label). */
  setModalTitle(title: string): this {
    this.config.modalTitle = title;
    return this;
  }

  /** Set the modal submit button label. */
  setSubmitLabel(label: string): this {
    this.config.submitLabel = label;
    return this;
  }

  /** Set the modal cancel button label. */
  setCancelLabel(label: string): this {
    this.config.cancelLabel = label;
    return this;
  }

  /** Build and return the resolved config. */
  build(): BunnyHeaderActionFormConfig<TForm, TData> {
    return this.config;
  }
}

// ── Internal Modal Component ───────────────────────────────────────────────

interface BunnyHeaderActionFormModalProps<TForm, TData> {
  config: BunnyHeaderActionFormConfig<TForm, TData>;
  kernel: BunnyKernel<unknown, unknown>;
  isOpen: boolean;
  onClose: () => void;
}

function BunnyHeaderActionFormModal<TForm, TData>({
  config,
  kernel,
  isOpen,
  onClose,
}: BunnyHeaderActionFormModalProps<TForm, TData>) {
  // ── Form state ─────────────────────────────────────────────────────────
  const [formData, setFormData] = useState<Partial<TForm>>(
    config.initialData ?? ({} as Partial<TForm>),
  );
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ── Action execution state ────────────────────────────────────────────
  const [actionState, setActionState] = useState<
    BunnyHeaderActionFormState<TData>
  >({
    type: "idle",
    data: config.initialDataPayload as TData,
  });

  const isProcessing = actionState.type === "processing";

  const handleChange = useCallback((name: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  // Stable ref for setState so the submit closure always gets fresh state
  const actionStateRef = useRef(actionState);
  actionStateRef.current = actionState;

  const updateActionState = useCallback(
    (
      updater: (
        prev: BunnyHeaderActionFormState<TData>,
      ) => BunnyHeaderActionFormState<TData>,
    ) => {
      setActionState((prev) => {
        const next = updater(prev);
        actionStateRef.current = next;
        return next;
      });
    },
    [],
  );

  // ── Submit handler ────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!config.submitAction || isProcessing) return;

    setActionState((prev) => ({
      ...prev,
      type: "processing",
      progress: undefined,
      errorMessage: undefined,
    }));

    try {
      await config.submitAction({
        formData: formData as TForm,
        state: actionStateRef.current,
        kernel,
        setState: updateActionState,
      });

      setActionState((prev) => ({
        ...prev,
        type: "success",
        progress: undefined,
      }));

      onClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An unexpected error occurred";
      setActionState((prev) => ({
        ...prev,
        type: "error",
        progress: undefined,
        errorMessage: message,
      }));
    }
  }, [config.submitAction, formData, kernel, isProcessing, onClose, updateActionState]);

  // ── Resolve button label dynamically ──────────────────────────────────
  const resolvedButtonLabel = useMemo(() => {
    if (config.buttonLabel) {
      return config.buttonLabel({
        formData: formData as TForm,
        loading: isProcessing,
        state: actionState,
      });
    }
    if (isProcessing && actionState.progress) return actionState.progress;
    if (isProcessing) return "Processing...";
    return config.submitLabel || config.label || "Submit";
  }, [config, formData, isProcessing, actionState]);

  // ── Build form config for BunnyFormBuilder ────────────────────────────
  const formConfig = useMemo<BunnyFormConfig<TForm> | null>(() => {
    if (!config.formFields || config.formFields.length === 0) return null;
    return {
      fields: config.formFields,
      submitLabel: config.submitLabel,
      ...config.formConfig,
    } as BunnyFormConfig<TForm>;
  }, [config.formFields, config.formConfig, config.submitLabel]);

  return (
    <Modal.Backdrop
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open && !isProcessing) {
          onClose();
        }
      }}
      isDismissable={!isProcessing}
    >
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-[520px]">
          <Modal.CloseTrigger isDisabled={isProcessing} />
          <Modal.Header>
            <Modal.Heading>
              {config.modalTitle || config.label || "Action"}
            </Modal.Heading>
          </Modal.Header>
          <Modal.Body className="flex flex-col gap-4">
            {/* Form fields rendered by BunnyFormBuilder */}
            {formConfig && (
              <BunnyFormBuilder<TForm>
                config={formConfig}
                formData={formData as TForm}
                onChange={handleChange}
                errors={formErrors}
              />
            )}

            {/* Error display */}
            {actionState.type === "error" && actionState.errorMessage && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {actionState.errorMessage}
              </div>
            )}

            {/* Progress indicator for long-running actions */}
            {isProcessing && actionState.progress && (
              <div className="flex items-center gap-2 text-sm text-primary">
                <span className="inline-block size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                <span>{actionState.progress}</span>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="ghost"
              isDisabled={isProcessing}
              onPress={onClose}
            >
              {config.cancelLabel || "Cancel"}
            </Button>
            {config.submitAction && (
              <Button
                variant="primary"
                isDisabled={isProcessing}
                onPress={handleSubmit}
              >
                {isProcessing ? (
                  <span className="inline-block size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : null}
                {resolvedButtonLabel}
              </Button>
            )}
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────

/**
 * Creates a `BunnyHeaderAction` that opens a modal with a dynamic form
 * and a configurable chain of submit actions.
 *
 * Supports long-running server action sequences, dynamic button labels,
 * progress reporting, and full access to the BunnyKernel.
 *
 * @example
 * ```tsx
 * const generateAction = useBunnyHeaderActionForm((builder) => {
 *   builder.setLabel("Generate");
 *   builder.setIcon(<Rocket />);
 *   builder.setInitialData({ templateType: "default" });
 *   builder.setForm([
 *     { name: "templateType", label: "Template", type: "select", options: [...] },
 *     { name: "count", label: "Chapter Count", type: "number" },
 *   ]);
 *   builder.data({ total: 10 });
 *   builder.setButtonLabel(({ state }) => {
 *     if (state.type === "processing" && state.progress) return state.progress;
 *     if (state.type === "processing") return "Generating...";
 *     return "Generate Chapters";
 *   });
 *   builder.setSubmitAction(async ({ formData, data, kernel, setState }) => {
 *     for (let i = 0; i < data.total; i++) {
 *       setState(prev => ({ ...prev, progress: `Chapter ${i + 1}/${data.total}` }));
 *       await someServerAction(formData, i);
 *     }
 *     kernel.adminPanel.table.refresh();
 *   });
 * });
 * ```
 */
export function useBunnyHeaderActionForm<TForm, TData = unknown>(
  configure:
    | BunnyHeaderActionFormConfig<TForm, TData>
    | ((builder: BunnyHeaderActionFormBuilder<TForm, TData>) => void),
): BunnyHeaderAction {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Resolve config from builder or direct object
  const config = useMemo<BunnyHeaderActionFormConfig<TForm, TData>>(() => {
    if (typeof configure === "function") {
      const builder = new BunnyHeaderActionFormBuilder<TForm, TData>("");
      configure(builder);
      return builder.build();
    }
    return configure;
  }, [configure]);

  // Store config in a ref so the onClick closure always has the latest version
  const configRef = useRef(config);
  configRef.current = config;

  const kernel = useBunnyKernel();

  const handleOpen = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  // Memoize the render function so the modal component is only created once
  const renderModal = useCallback(
    (ctx?: BunnyKernel<unknown, unknown>) => (
      <BunnyHeaderActionFormModal<TForm, TData>
        key={config.id}
        config={configRef.current}
        kernel={ctx ?? kernel}
        isOpen={isModalOpen}
        onClose={handleClose}
      />
    ),
    [config.id, kernel, isModalOpen, handleClose],
  );

  const action: BunnyHeaderAction = useMemo(
    () => ({
      id: config.id,
      label: config.label || config.id,
      icon: config.icon,
      variant: config.variant,
      onClick: handleOpen,
      // The render prop places the modal instance near the header button
      render: renderModal,
    }),
    [config.id, config.label, config.icon, config.variant, handleOpen, renderModal],
  );

  return action;
}
