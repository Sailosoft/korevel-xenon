// bui.author-skills.attach-field.component.tsx
//
// "custom" form field wrapper around the reusable BUIAuthorSkillPicker. It
// maps the picker's selection into the form data under `skillNames` and, for
// an existing author (update/view), lets the picker preload the attached
// skills. Available in create, update, and view form modes.

"use client";

import React from "react";
import type { BunnyFieldRendererProps } from "@/src/modules/bunny/src/form/BunnyForm.Interface";
import type { BUIAuthor } from "../authors/bui.author.entity";
import BUIAuthorSkillPicker from "./bui.author-skills.picker.component";

export default function BUIAuthorSkillAttachField({
  value,
  onChange,
  formData,
}: BunnyFieldRendererProps) {
  const authorId = (formData as unknown as BUIAuthor | undefined)?.id;

  return (
    <BUIAuthorSkillPicker
      selectedNames={Array.isArray(value) ? (value as string[]) : undefined}
      onChange={(names) => onChange("skillNames", names)}
      authorId={authorId}
    />
  );
}
