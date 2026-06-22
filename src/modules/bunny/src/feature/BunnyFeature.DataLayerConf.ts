import { AdminPanelMutation } from "@/src/modules/admin-panel/features/mutation/admin-panel-mutation.interface";
import { AdminPanelQuery } from "@/src/modules/admin-panel/features/query/admin-panel-query.interface";
import { IBUIRepositoryAdminPanel } from "@/src/modules/bunny-ai/src/database/bui.repository.interface";
import { BunnyConfig } from "../Bunny.Interface";

export class BunnyDataLayerConfigurator<TRow, TForm> {
  constructor(private config: BunnyConfig<TRow, TForm>) {}

  public useQuery(query: AdminPanelQuery<TRow, TForm>): this {
    this.config.query = query;
    return this;
  }

  public useMutation(mutation: AdminPanelMutation<TForm>): this {
    this.config.mutation = mutation;
    return this;
  }

  public useRepository(repository: IBUIRepositoryAdminPanel<TRow>): this {
    this.config.query = {
      getAll: repository.panelGetAll,
      getOne: repository.panelGetOne as AdminPanelQuery<TRow, TForm>["getOne"],
    };

    this.config.mutation = {
      create:
        repository.panelCreate as unknown as AdminPanelMutation<TForm>["create"],
      update:
        repository.panelUpdate as unknown as AdminPanelMutation<TForm>["update"],
      delete:
        repository.panelDelete as unknown as AdminPanelMutation<TForm>["delete"],
    };

    return this;
  }
}
