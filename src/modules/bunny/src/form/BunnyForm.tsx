import { useAdminPanelContext } from '@/src/modules/admin-panel/features/provider';
import { useBunnyConfig } from '../context/BunnyContext';
import { BunnyFormBuilder } from './builder/BunnyFormBuilder';

export default function BunnyForm<TRow, TForm>() {
  const { formConfig } = useBunnyConfig<TRow, TForm>();
  const { form } = useAdminPanelContext<TRow, TForm>();
  const { formData } = form;
  return (
    <BunnyFormBuilder<TForm>
      config={formConfig!}
      formData={formData}
      onChange={form.handleChange}
    />
  );
}