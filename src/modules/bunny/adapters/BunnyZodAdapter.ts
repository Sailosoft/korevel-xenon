import { z } from "zod";
import type { BunnyValidationAdapter } from "../src/Bunny.Interface";

/**
 * Creates a Bunny-compatible validation adapter from a Zod schema.
 *
 * This adapter lives in **your consumer project** — not inside Bunny core —
 * so Bunny never gains a direct dependency on Zod. You can use this with
 * any Bunny-powered form by passing the returned adapter to
 * `BunnyConfig.validationAdapter`.
 *
 * @param schema A Zod schema that validates the full form shape `TForm`.
 * @returns A `BunnyValidationAdapter` that translates Zod parse errors into
 *          the `Record<string, string>` format Bunny's `setFormError()` expects.
 *
 * @example
 * ```tsx
 * import { useBunnyZodAdapter } from "@/modules/bunny/adapters/BunnyZodAdapter";
 * import { z } from "zod";
 *
 * const schema = z.object({
 *   title: z.string().min(1, "Title is required"),
 *   email: z.string().email("Invalid email address"),
 *   age: z.coerce.number().min(18, "Must be 18 or older"),
 * });
 *
 * <Bunny
 *   config={{
 *     formConfig: myFormConfig,
 *     validationAdapter: useBunnyZodAdapter(schema),
 *     // ... other config
 *   }}
 * />
 * ```
 */
export function useBunnyZodAdapter<TForm extends Record<string, unknown>>(
  schema: z.ZodSchema<TForm>,
): BunnyValidationAdapter<TForm> {
  return {
    validate: (formData: TForm): Record<string, string> => {
      const result = schema.safeParse(formData);
      if (result.success) return {};

      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join(".");
        // First issue wins per field — prevents overwhelming the user
        if (!errors[path]) {
          errors[path] = issue.message;
        }
      }
      return errors;
    },
  };
}
