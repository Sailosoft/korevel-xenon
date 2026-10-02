// modules/core/index.ts

export {
  BD_PROJECT_EMPTY_FORM,
  BD_PROJECT_DEFAULT_AGENT_SETTINGS,
  BD_PROJECT_DEFAULT_ISSUE_TYPES,
  toProjectForm,
} from "./BDProject.Types";
export type { BDProjectForm } from "./BDProject.Types";

export { BDProjectRepository, bdProjectRepository } from "./BDProject.Repository";

export {
  BD_PROJECT_MODULES,
  buildProjectNavItems,
} from "./BDProject.Module";
export type { BDProjectModuleDef } from "./BDProject.Module";

export { useBDProjects, useBDProject, useBDProjectStats } from "./BDProject.Hooks";
export type { BDProjectStats } from "./BDProject.Hooks";

export { BDProjectProvider, useBDProjectContext } from "./BDProject.Context";
export type { BDProjectContextValue } from "./BDProject.Context";

export { BDProjectComponent } from "./BDProject.Component";
export { BDProjectListComponent } from "./BDProjectList.Component";
export { BDProjectSettingsComponent } from "./BDProjectSettings.Component";
