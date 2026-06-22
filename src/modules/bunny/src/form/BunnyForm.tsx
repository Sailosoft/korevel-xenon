import { useAdminPanelContext } from "@/src/modules/admin-panel/features/provider";
import { useBunnyConfig } from "../context/BunnyContext";
import { BunnyFormBuilder } from "./builder/BunnyFormBuilder";

export default function BunnyForm<TRow, TForm>() {
  const config = useBunnyConfig<TRow, TForm>();
  const { form } = useAdminPanelContext<TRow, TForm>();

  const resolvedConfig = !config.formConfig
    ? undefined
    : typeof config.formConfig === "function"
      ? config.formConfig(form)
      : config.formConfig;

  // No formConfig defined — nothing to render
  if (!resolvedConfig) {
    return null;
  }

  return (
    <BunnyFormBuilder<TForm>
      config={resolvedConfig}
      formData={form.formData}
      onChange={form.handleChange}
      errors={form.formError || {}}
    />
  );
}
