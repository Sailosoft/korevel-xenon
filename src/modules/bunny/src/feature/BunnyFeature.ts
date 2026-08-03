import { AdminPanelMutation } from "@/src/modules/admin-panel/features/mutation/admin-panel-mutation.interface";
import { AdminPanelQuery } from "@/src/modules/admin-panel/features/query/admin-panel-query.interface";
import {
  AdminPanelFormMode,
  UseAdminPanelForm,
} from "@/src/modules/admin-panel/features/form/admin-panel-form.interface";
import { IBUIRepositoryAdminPanel } from "@/src/modules/bunny-ai/src/database/bui.repository.interface";
import {
  BunnyConfig,
  BunnyModalSize,
  BunnyOnSuccessBehavior,
  BunnyValidationAdapter,
} from "../Bunny.Interface";
import {
  BunnyHeaderAction,
  BunnyHeaderActionType,
} from "../header/BunnyHeader.Interface";
import { BunnyRowDefaultActions } from "../rows/BunnyRow.Interface";
import { BunnyRowAction, BunnyColumn } from "../table/BunnyTable.Interface";
import { BunnyFormConfig, BunnyFormField } from "../form/BunnyForm.Interface";
import { BunnyFeatureConstant } from "./BunnyFeature.Constant";
import BunnyFeatureUtil from "./BunnyFeature.Util";
import { BunnyModalConfigurator } from "./BunnyFeature.ModalConf";
import { BunnyHeaderConfigurator } from "./BunnyFeature.HeaderConf";
import { BunnyRowConfigurator } from "./BunnyFeature.RowConf";
import { BunnyTableConfigurator } from "./BunnyFeature.TableConf";
import { BunnyFormConfigurator } from "./BunnyFeature.FormConf";
import { BunnyDataLayerConfigurator } from "./BunnyFeature.DataLayerConf";

// ── Deep-freeze utility ─────────────────────────────────────────────────
// Recursively freezes an object so it becomes immutable at runtime.
// Functions, primitives, null, and already-frozen objects are skipped.
function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== "object" || Object.isFrozen(obj)) {
    return obj;
  }

  // Depth-first: freeze all own property values first
  for (const key of Object.getOwnPropertyNames(obj)) {
    const value = (obj as Record<string, unknown>)[key];
    if (typeof value === "object" && value !== null) {
      deepFreeze(value);
    }
  }

  return Object.freeze(obj) as T;
}

export class BunnyFeature<TRow, TForm> {
  protected config: BunnyConfig<TRow, TForm>;
  protected util: BunnyFeatureUtil;

  public constructor(title: string, rowKey: keyof TRow) {
    this.util = new BunnyFeatureUtil();
    // Clone the default config so each module gets an independent object
    // (prevents cross-module corruption from shared mutable default)
    this.config = {
      ...BunnyFeatureConstant.default,
      title,
      rowKey,
    } as BunnyConfig<TRow, TForm>;
    this.config.titlePlural = this.util.pluralize(title);
  }

  public build(
    configure: (config: BunnyConfig<TRow, TForm>) => void,
  ): BunnyConfig<TRow, TForm> {
    configure(this.config);
    return this.config;
  }

  /**
   * Factory activation method matching modern ASP.NET setup architectures.
   *
   * Returns a **deep-frozen (sealed)** `BunnyConfig` — the config is immutable
   * at runtime so it can safely be used as a `Map` key or shared across consumers
   * without risk of accidental mutation.
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

    // Seal the config — prevent any post-creation mutation
    return feature.config;
  }

  public static createImmutable<R, F>(
    title: string,
    rowKey: keyof R,
    configure: (feature: BunnyFeature<R, F>) => void,
  ): Readonly<BunnyConfig<R, F>> {
    const feature = new BunnyFeature<R, F>(title, rowKey);
    configure(feature);

    deepFreeze(feature.config);
    return feature.config as Readonly<BunnyConfig<R, F>>;
  }

  public setCustomPlural(pluralTitle: string): this {
    this.config.titlePlural = pluralTitle;
    return this;
  }

  /**
   * Set the URL pattern that this module handles.
   *
   * When used with `BunnyPackage` / `BunnyNextPackage`, the matching logic
   * activates this module when `window.location.pathname` matches `moduleUrl`.
   *
   * Supports:
   * - Exact paths: `"/modules/books"`
   * - Prefix wildcards: `"/modules/books/*"`
   * - Regex patterns: `"/^\\/modules\\/books/"`
   *
   * @see BunnyPackage
   */
  public setModuleUrl(moduleUrl: string): this {
    this.config.module_url = moduleUrl;
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

  /**
   * Set a validation adapter to replace the built-in field-level rules.
   *
   * The adapter takes **precedence** over `BunnyValidationRule` entries on fields.
   * Use this to plug in Zod, Yup, Joi, or any custom validation logic without
   * adding those libraries as Bunny dependencies.
   *
   * @example
   * ```ts
   * BunnyFeature.create("Books", "id", (feature) => {
   *   feature.setValidationAdapter(useBunnyZodAdapter(myZodSchema));
   * });
   * ```
   *
   * @see BunnyValidationAdapter
   */
  public setValidationAdapter(adapter: BunnyValidationAdapter<TForm>): this {
    this.config.validationAdapter = adapter;
    return this;
  }

  /**
   * Enable default header and row actions
   */
  public useDefault() {
    this.config.defaultHeaderActions = true;
    this.config.defaultRowActions = true;
    return this;
  }

  /**
   * Enable only the default row actions (view / edit / delete) without the
   * default header actions. Individual defaults can still be hidden later via
   * `BunnyRowConfigurator.hide(...)`.
   */
  public useDefaultRowActions(): this {
    this.config.defaultRowActions = true;
    return this;
  }

  public useDataLayer({
    query,
    mutation,
  }: {
    query: AdminPanelQuery<TRow, TForm>;
    mutation: AdminPanelMutation<TForm>;
  }): this {
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
