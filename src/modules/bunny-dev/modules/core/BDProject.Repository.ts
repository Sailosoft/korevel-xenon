// BDProject.Repository.ts — project-specific repository on top of BDRepository.

import { bdDB } from "../../BDDatabase";
import type { BDProject } from "../../BDDomain.Types";
import { BDRepository, type BDCreateInput } from "../../BDRepository";
import {
  BD_PROJECT_DEFAULT_AGENT_SETTINGS,
  BD_PROJECT_DEFAULT_ISSUE_TYPES,
  BD_PROJECT_EMPTY_FORM,
  type BDProjectForm,
} from "./BDProject.Types";

export class BDProjectRepository extends BDRepository<BDProject> {
  constructor() {
    super(bdDB.projects);
  }

  /** Create a project, applying default issue types and agent settings. */
  async createProject(form: BDProjectForm): Promise<BDProject> {
    return this.create({
      key: form.key.trim(),
      name: form.name.trim(),
      description: form.description.trim(),
      issueTypes: BD_PROJECT_DEFAULT_ISSUE_TYPES,
      agentSettings: BD_PROJECT_DEFAULT_AGENT_SETTINGS,
    } as BDCreateInput<BDProject>);
  }

  /** Update only the editable project fields. */
  async updateProject(id: string, form: BDProjectForm): Promise<BDProject | undefined> {
    return this.update(id, {
      key: form.key.trim(),
      name: form.name.trim(),
      description: form.description.trim(),
    });
  }

  /** Merge a partial agent-settings patch into a project. */
  async updateAgentSettings(
    id: string,
    patch: Partial<BDProject["agentSettings"]>,
  ): Promise<BDProject | undefined> {
    const project = await this.get(id);
    if (!project) return undefined;
    const settings = {
      ...BD_PROJECT_DEFAULT_AGENT_SETTINGS,
      ...project.agentSettings,
      ...patch,
    };
    return this.update(id, { agentSettings: settings });
  }
}

export const bdProjectRepository = new BDProjectRepository();

export { BD_PROJECT_EMPTY_FORM };
export type { BDProjectForm };
