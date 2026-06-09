import { AdminPanelMutation } from "@/src/modules/admin-panel/features/mutation/admin-panel-mutation.interface";
import { AdminPanelQuery } from "@/src/modules/admin-panel/features/query/admin-panel-query.interface";
import { IBUIRepositoryAdminPanel } from "@/src/modules/bunny-ai/src/database/bui.repository.interface";
import {
  BunnyConfig,
  BunnyModalSize,
  BunnyOnSuccessBehavior,
} from "../Bunny.Interface";
import {
  BunnyHeaderAction,
  BunnyHeaderActionType,
} from "../header/BunnyHeader.Interface";
import { BunnyRowDefaultActions } from "../rows/BunnyRow.Interface";
import { BunnyRowAction, BunnyColumn } from "../table/BunnyTable.Interface";
import { BunnyFeatureConstant } from "./Bunny-Feature.Constant";
import BunnyFeatureUtil from "./Bunny-Feature.Util";

export class BunnyFeature<TRow, TForm> {
  protected config: BunnyConfig<TRow, TForm>;
  protected util: BunnyFeatureUtil;

  private constructor(title: string, rowKey: keyof TRow) {
    this.util = new BunnyFeatureUtil();
    this.config = BunnyFeatureConstant.default;
    this.config.rowKey = rowKey;
    this.config.titlePlural = this.util.pluralize(title);
  }

  /**
   * Factory activation method matching modern ASP.NET setup architectures
   */
  public static create<R, F>(
    title: string,
    rowKey: keyof R,
    configure: (feature: BunnyFeature<R, F>) => void,
  ): BunnyConfig<R, F> {
    const feature = new BunnyFeature<R, F>(title, rowKey);

    // Process pipeline
    configure(feature);

    // Assert final configuration consistency before returning the layout context
    // BunnyFeatureException.assertIsValid(feature.config);

    return feature.config;
  }

  public setCustomPlural(pluralTitle: string): this {
    this.config.titlePlural = pluralTitle;
    return this;
  }

  public setModalSize(size: BunnyConfig<TRow, TForm>["modalSize"]): this {
    this.config.modalSize = size;
    return this;
  }

  public setModalWidth(width: number): this {
    this.config.modalSizeWidth = width;
    return this;
  }

  public useDataLayer(
    query: AdminPanelQuery<TRow, TForm>,
    mutation: AdminPanelMutation<TForm>,
  ): this {
    this.config.query = query;
    this.config.mutation = mutation;
    return this;
  }

  public configureDataLayer(
    configure: (configurator: BunnyDataLayerConfigurator<TRow, TForm>) => void,
  ): this {
    configure(new BunnyDataLayerConfigurator(this.config));
    return this;
  }

  public configureForm(
    configure: (configurator: BunnyFormConfigurator<TRow, TForm>) => void,
  ): this {
    configure(new BunnyFormConfigurator(this.config));
    return this;
  }

  public configureTable(
    configure: (configurator: BunnyTableConfigurator<TRow, TForm>) => void,
  ): this {
    configure(new BunnyTableConfigurator(this.config));
    return this;
  }

  public configureHeader(
    configure: (configurator: BunnyHeaderConfigurator<TRow, TForm>) => void,
  ): this {
    configure(new BunnyHeaderConfigurator(this.config));
    return this;
  }

  public configureRow(
    configure: (configurator: BunnyRowConfigurator<TRow, TForm>) => void,
  ): this {
    configure(new BunnyRowConfigurator(this.config));
    return this;
  }

  public configureModal(
    configure: (configurator: BunnyModalConfigurator<TRow, TForm>) => void,
  ): this {
    configure(new BunnyModalConfigurator(this.config));
    return this;
  }
}

class BunnyModalConfigurator<TRow, TForm> {
  constructor(private config: BunnyConfig<TRow, TForm>) {}

  public setSize(size: BunnyModalSize | number): this {
    if (typeof size === "string") {
      this.config.modalSize = size;
    } else if (typeof size === "number") {
      this.config.modalSizeWidth = size;
    }
    return this;
  }
}

class BunnyHeaderConfigurator<TRow, TForm> {
  constructor(private config: BunnyConfig<TRow, TForm>) {}

  public disableDefaults(): this {
    this.config.defaultHeaderActions = false;
    return this;
  }

  public hide(actions: BunnyHeaderActionType[]): this {
    this.config.hideHeaderActions = actions;
    return this;
  }

  public addAction(action: BunnyHeaderAction<TRow, TForm>): this {
    if (!this.config.headerActions) this.config.headerActions = [];
    this.config.headerActions.push(action);
    return this;
  }
}

class BunnyRowConfigurator<TRow, TForm> {
  constructor(private config: BunnyConfig<TRow, TForm>) {}

  public disableDefaults(): this {
    this.config.defaultRowActions = false;
    return this;
  }

  public hide(actions: BunnyRowDefaultActions[]): this {
    this.config.hideRowActions = actions;
    return this;
  }

  public addAction(action: BunnyRowAction<TRow>): this {
    if (!this.config.rowActions) this.config.rowActions = [];
    this.config.rowActions.push(action);
    return this;
  }

  public setColumnWidth(width: number): this {
    this.config.rowActionsColWidth = width;
    return this;
  }

  public setMaxVisibleLength(length: number): this {
    this.config.rowActionsColLength = length;
    return this;
  }
}

class BunnyTableConfigurator<TRow, TForm> {
  constructor(private config: BunnyConfig<TRow, TForm>) {
    if (!this.config.props) this.config.props = {};
    if (!this.config.props.table) this.config.props.table = {};
  }

  public setHeight(height: string | number): this {
    this.config.tableHeight = height;
    return this;
  }

  public addColumns(columns: BunnyColumn<TRow>[]): this {
    this.config.columns = [...this.config.columns, ...columns];
    return this;
  }

  public setMode(mode: BunnyConfig<TRow, TForm>["tableMode"]): this {
    this.config.tableMode = mode;
    return this;
  }

  public configureProps(
    props: NonNullable<NonNullable<BunnyConfig<TRow, TForm>["props"]>["table"]>,
  ): this {
    this.config.props!.table = { ...this.config.props!.table, ...props };
    return this;
  }
}

class BunnyFormConfigurator<TRow, TForm> {
  constructor(private config: BunnyConfig<TRow, TForm>) {
    if (!this.config.props) this.config.props = {};
    if (!this.config.props.form) this.config.props.form = {};
  }

  public configureProps(
    props: NonNullable<NonNullable<BunnyConfig<TRow, TForm>["props"]>["form"]>,
  ): this {
    this.config.props!.form = { ...this.config.props!.form, ...props };
    return this;
  }

  public setOnSuccess(onSuccess: BunnyOnSuccessBehavior): this {
    this.config.onSuccess = onSuccess;
    return this;
  }
}

class BunnyDataLayerConfigurator<TRow, TForm> {
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
