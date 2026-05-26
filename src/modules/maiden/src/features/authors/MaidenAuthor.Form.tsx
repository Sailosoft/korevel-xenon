import { useAdminPanelContext } from "@/src/modules/admin-panel/features/provider";
import { BunnyFormBuilder } from "@/src/modules/bunny/src/form/builder/BunnyFormBuilder";
import { BunnyFormConfig } from "@/src/modules/bunny/src/form/BunnyForm.Interface";
import { Fieldset, Form } from "@heroui/react";
import { useEffect } from "react";
import { MaidenAuthor } from "../../entities/entities";

export default function MaidenAuthorForm() {
  const formConf: BunnyFormConfig<MaidenAuthor> = {
    fields: [
      {
        name: "name",
        label: "Name",
        type: "text",
        placeholder: "Enter your name",
        required: true,
      },
      {
        name: "description",
        label: "Biography",
        type: "textarea",
        placeholder: "Enter author biography",
        required: false,
      },
    ],
  };

  const { form } = useAdminPanelContext<unknown, MaidenAuthor>();
  const { formData, handleChange, resetForm } = form;

  // useEffect(() => {
  //   resetForm();
  // }, []);

  return (
    <BunnyFormBuilder
      config={formConf}
      formData={formData}
      onChange={handleChange}
    />
  );
}
