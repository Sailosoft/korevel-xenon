// BDProject.Types.ts — form shapes and defaults for the project core.

import type { BDProject, BDIssueType } from "./BDProject.Domain";
import type { BDAgentSettings } from "../agent-manager/BDAgent.Domain";
import { BDAgentHandoffPolicy } from "../agent-manager/BDAgent.Domain";

/** Editable fields of a project (the create/edit form shape). */
export interface BDProjectForm {
  key: string;
  name: string;
  description: string;
}

export const BD_PROJECT_EMPTY_FORM: BDProjectForm = {
  key: "",
  name: "",
  description: "",
};

export const BD_PROJECT_DEFAULT_ISSUE_TYPES: BDIssueType[] = [
  "epic",
  "story",
  "task",
  "bug",
  "subtask",
  "spike",
];

export const BD_PROJECT_DEFAULT_AGENT_SETTINGS: BDAgentSettings = {
  concurrent: 1,
  active: false,
  autoAssign: false,
  allowHandoff: true,
  handoffPolicy: BDAgentHandoffPolicy.manual,
  maxIterations: 8,
};

/** Extract the editable form values from a stored project. */
export function toProjectForm(project: BDProject): BDProjectForm {
  return {
    key: project.key,
    name: project.name,
    description: project.description,
  };
}
