import { useAdminPanelContext } from '@/src/modules/admin-panel/features/provider';
import { useBunnyConfig } from '../context/BunnyContext';
import { BunnyFormBuilder } from './builder/BunnyFormBuilder';

export default function BunnyForm() {
  const { formConfig } = useBunnyConfig();
  const { form } = useAdminPanelContext();
  return (
    <BunnyFormBuilder
      config={formConfig}
      formData={form.formData}
      onChange={form.handleChange}
    />
  );
}