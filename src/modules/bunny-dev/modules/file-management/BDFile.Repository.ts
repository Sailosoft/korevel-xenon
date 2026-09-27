// BDFile.Repository.ts — folder and file repositories for the virtual FS.

import { bdDB } from "../../BDDatabase";
import type { BDProjectFile, BDProjectFolder } from "../../BDDomain.Types";
import { BDRepository } from "../../BDRepository";

export class BDFolderRepository extends BDRepository<BDProjectFolder> {
  constructor() {
    super(bdDB.projectFolders);
  }

  async listByProject(projectId: string): Promise<BDProjectFolder[]> {
    const rows = await this.listWhere("projectId", projectId);
    return rows.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
  }
}

export class BDFileRepository extends BDRepository<BDProjectFile> {
  constructor() {
    super(bdDB.projectFiles);
  }

  async listByProject(projectId: string): Promise<BDProjectFile[]> {
    const rows = await this.listWhere("projectId", projectId);
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }

  async listByFolder(folderId: string): Promise<BDProjectFile[]> {
    return this.listWhere("folderId", folderId);
  }
}

export const bdFolderRepository = new BDFolderRepository();
export const bdFileRepository = new BDFileRepository();
