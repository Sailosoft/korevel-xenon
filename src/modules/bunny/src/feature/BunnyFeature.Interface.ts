import { AdminPanelMutation } from "@/src/modules/admin-panel/features/mutation/admin-panel-mutation.interface";
import { AdminPanelQuery } from "@/src/modules/admin-panel/features/query/admin-panel-query.interface";
import { AdminPanelFormMode } from "@/src/modules/admin-panel/features/form/admin-panel-form.interface";
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
  BunnyHeaderConfig,
} from "../header/BunnyHeader.Interface";
import { BunnyRowDefaultActions } from "../rows/BunnyRow.Interface";
import { BunnyColumn, BunnyRowAction } from "../table/BunnyTable.Interface";
import { BunnyFormConfig, BunnyFormField } from "../form/BunnyForm.Interface";
import { BunnyModalHeaderAction } from "../modal/BunnyModal.Interface";

/**
 * Shared contract for every fluent **configurator** used by {@link IBunnyFeature}.
 *
 * Configurators wrap the mutable `BunnyConfig` and expose small, opinionated
 * fluent methods that mutate that config in place. Each method returns `this`
 * so calls can be chained. They are created internally by `BunnyFeature`
 * (e.g. via `configureForm(...)`) — consumers receive them inside the
 * configuration callbacks and should **never** instantiate them directly.
 */

/**
 * Fluent API for the internal helper used by `BunnyFeature`.
 *
 * Provides text utilities — currently only pluralization — used when deriving
 * the plural display title for a module.
 *
 * @see BunnyFeature.Util.ts
 */
export interface IBunnyFeatureUtil {
  /**
   * Pluralize a single English word.
   *
   * Handles irregulars (`criterion` → `criteria`), sibilants (`Match` →
   * `Matches`), consonant-`y` (`Category` → `Categories`), `f`/`fe`
   * (`Knife` → `Knives`), and returns the word unchanged when it already
   * looks plural or is `series`/`species`.
   *
   * @param word - The word to pluralize.
   * @returns The pluralized word, or an empty string for falsy input.
   */
  pluralize(word: string): string;
}

/**
 * Configurator for the **data layer** (query + mutation) of a feature.
 *
 * Wires an `AdminPanelQuery` / `AdminPanelMutation`, or binds an
 * `IBUIRepositoryAdminPanel` so all CRUD operations are derived from a
 * single repository object.
 *
 * @typeParam TRow  - Shape of a table row / entity.
 * @typeParam TForm - Shape of the form data.
 *
 * @see BunnyFeature.DataLayerConf.ts
 */
export interface IBunnyDataLayerConfigurator<TRow, TForm> {
  /**
   * Attach an explicit query object (getAll / getOne).
   *
   * @param query - The `AdminPanelQuery` implementation to use.
   */
  useQuery(query: AdminPanelQuery<TRow, TForm>): this;

  /**
   * Attach an explicit mutation object (create / update / delete).
   *
   * @param mutation - The `AdminPanelMutation` implementation to use.
   */
  useMutation(mutation: AdminPanelMutation<TForm>): this;

  /**
   * Bind a repository and derive both query and mutation from it.
   *
   * Maps `panelGetAll`/`panelGetOne` onto the query and
   * `panelCreate`/`panelUpdate`/`panelDelete` onto the mutation.
   *
   * @param repository - The repository implementing the admin-panel contract.
   */
  useRepository(repository: IBUIRepositoryAdminPanel<TRow>): this;
}

/**
 * Configurator for the **form** section of a feature.
 *
 * Controls form props, grid layout, fields, success behavior, pre-submit
 * transforms, and default "create" data.
 *
 * @typeParam TRow  - Shape of a table row / entity.
 * @typeParam TForm - Shape of the form data.
 *
 * @see BunnyFeature.FormConf.ts
 */
export interface IBunnyFormConfigurator<TRow, TForm> {
  /**
   * Deep-merge props onto the form's underlying admin-panel props.
   *
   * @param props - Partial form props to merge onto the existing settings.
   */
  configureProps(
    props: NonNullable<NonNullable<BunnyConfig<TRow, TForm>["props"]>["form"]>,
  ): this;

  /**
   * Set the behavior after a successful create/update submission.
   *
   * @param onSuccess - The `BunnyOnSuccessBehavior` (`openView`, `closeOnly`, or `redirect`).
   */
  setOnSuccess(onSuccess: BunnyOnSuccessBehavior): this;

  /**
   * Register a transform that runs on the form data just before submit.
   *
   * @param beforeSubmit - Receives the current (partial) form data and the
   *   active mode; must return the final `TForm` payload to submit.
   */
  setBeforeSubmit(
    beforeSubmit: (form: Partial<TForm>, mode: AdminPanelFormMode) => TForm,
  ): this;

  /**
   * Append form fields to be rendered by `BunnyFormBuilder`.
   *
   * @param fields - Array of `BunnyFormField` definitions.
   */
  addFields(fields: BunnyFormField<TForm>[]): this;

  /**
   * Set the number of grid columns used by the form layout (default: 1).
   *
   * @param cols - Number of grid columns.
   */
  setGridCols(cols: number): this;

  /**
   * Pre-populate default form data when the modal opens in "create" mode.
   *
   * Also pipes through `props.form.initialData` so the admin-panel form hook
   * picks it up on reset. For "update"/"view" modes, API data overwrites it.
   *
   * @param data - Partial form data with default values for one or more fields.
   */
  setFormDefaultData(data: Partial<TForm>): this;
}

/**
 * Configurator for the **header** section of a feature.
 *
 * Controls default header actions (show/hide), custom header action buttons,
 * and the header display config (icon, description, variant).
 *
 * @typeParam TRow  - Shape of a table row / entity.
 * @typeParam TForm - Shape of the form data.
 *
 * @see BunnyFeature.HeaderConf.ts
 */
export interface IBunnyHeaderConfigurator<TRow, TForm> {
  /**
   * Turn off all default header actions (create, refresh, etc.).
   */
  disableDefaults(): this;

  /**
   * Explicitly hide specific default header buttons.
   *
   * @param actions - Header action types to hide.
   */
  hide(actions: BunnyHeaderActionType[]): this;

  /**
   * Append a custom header action button.
   *
   * @param action - The `BunnyHeaderAction` to add.
   */
  addAction(action: BunnyHeaderAction<TRow, TForm>): this;

  /**
   * Merge display configuration onto the header (icon, description, variant).
   *
   * @param config - Partial `BunnyHeaderConfig` to merge.
   */
  setConfig(config: Partial<BunnyHeaderConfig>): this;
}

/**
 * Configurator for the **modal** section of a feature.
 *
 * Controls modal sizing and the header action buttons rendered inside the
 * modal.
 *
 * @typeParam TRow  - Shape of a table row / entity.
 * @typeParam TForm - Shape of the form data.
 *
 * @see BunnyFeature.ModalConf.ts
 */
export interface IBunnyModalConfigurator<TRow, TForm> {
  /**
   * Set the modal size. Strings map to presets (`sm`, `md`, `lg`, ...);
   * numbers set a custom width in pixels.
   *
   * @param size - A `BunnyModalSize` preset or a pixel width number.
   */
  setSize(size: BunnyModalSize | number): this;

  /**
   * Replace all modal header action buttons with a new set.
   *
   * @param actions - The full list of `BunnyModalHeaderAction` to use.
   */
  setModalHeaderActions(actions: BunnyModalHeaderAction<TRow, TForm>[]): this;

  /**
   * Append a single modal header action button.
   *
   * @param action - The `BunnyModalHeaderAction` to add.
   */
  addModalHeaderAction(action: BunnyModalHeaderAction<TRow, TForm>): this;
}

/**
 * Configurator for the **row actions** section of a feature.
 *
 * Controls default row actions (view / edit / delete), custom row action
 * buttons, and the sizing of the row-actions column.
 *
 * @typeParam TRow  - Shape of a table row / entity.
 * @typeParam TForm - Shape of the form data.
 *
 * @see BunnyFeature.RowConf.ts
 */
export interface IBunnyRowConfigurator<TRow, TForm> {
  /**
   * Turn off all default row actions (view / edit / delete).
   */
  disableDefaults(): this;

  /**
   * Explicitly hide specific default row buttons.
   *
   * @param actions - Default row actions to hide.
   */
  hide(actions: BunnyRowDefaultActions[]): this;

  /**
   * Append a single custom row action button.
   *
   * @param action - The `BunnyRowAction` to add.
   */
  addAction(action: BunnyRowAction<TRow>): this;

  /**
   * Append multiple custom row action buttons at once.
   *
   * @param actions - Array of `BunnyRowAction` to add.
   */
  addActions(actions: BunnyRowAction<TRow>[]): this;

  /**
   * Set the width of the row-actions column (in pixels).
   *
   * @param width - Column width in pixels.
   */
  setColumnWidth(width: number): this;

  /**
   * Set the maximum number of row-action buttons shown before collapsing
   * into a "more" menu.
   *
   * @param length - Maximum visible action count.
   */
  setMaxVisibleLength(length: number): this;
}

/**
 * Configurator for the **table** section of a feature.
 *
 * Controls table height, columns (with de-duplication), display mode, and
 * the table's underlying admin-panel props.
 *
 * @typeParam TRow  - Shape of a table row / entity.
 * @typeParam TForm - Shape of the form data.
 *
 * @see BunnyFeature.TableConf.ts
 */
export interface IBunnyTableConfigurator<TRow, TForm> {
  /**
   * Set the table height (px number or CSS string).
   *
   * @param height - Height as a number (px) or CSS length string.
   */
  setHeight(height: string | number): this;

  /**
   * Append columns, skipping any whose `field` already exists.
   *
   * @param columns - Array of `BunnyColumn` definitions to add.
   */
  addColumns(columns: BunnyColumn<TRow>[]): this;

  /**
   * Set the table display mode.
   *
   * @param mode - One of the allowed `BunnyTableMode` values.
   */
  setMode(mode: BunnyConfig<TRow, TForm>["tableMode"]): this;

  /**
   * Deep-merge props onto the table's underlying admin-panel props.
   *
   * @param props - Partial table props to merge onto the existing settings.
   */
  configureProps(
    props: NonNullable<NonNullable<BunnyConfig<TRow, TForm>["props"]>["table"]>,
  ): this;
}

/**
 * The main fluent **feature builder** for Bunny modules.
 *
 * `BunnyFeature` is the entry point used to assemble a full
 * `BunnyConfig` — title, data layer, form, table, header, row actions and
 * modal — through a chainable API. It is usually driven through the static
 * factories `BunnyFeature.create(...)` / `BunnyFeature.createImmutable(...)`
 * (see {@link BunnyFeature.ts}).
 *
 * @typeParam TRow  - Shape of a table row / entity.
 * @typeParam TForm - Shape of the form data.
 *
 * @see BunnyFeature.ts
 */
export interface IBunnyFeature<TRow, TForm> {
  /**
   * Build the final `BunnyConfig` by applying a configure callback.
   *
   * @param configure - Receives the mutable config; may tweak it directly.
   * @returns The fully configured (mutable) `BunnyConfig`.
   */
  build(
    configure: (config: BunnyConfig<TRow, TForm>) => void,
  ): BunnyConfig<TRow, TForm>;

  /**
   * Override the auto-generated plural display title.
   *
   * @param pluralTitle - The plural title to use.
   */
  setCustomPlural(pluralTitle: string): this;

  /**
   * Set the URL pattern this module handles.
   *
   * Supports exact paths (`/books`), prefix wildcards (`/books/*`) and regex
   * patterns (`/^\/books\//`). Used by `BunnyPackage`/`BunnyNextPackage`
   * to activate the module on matching routes.
   *
   * @param moduleUrl - The URL pattern.
   */
  setModuleUrl(moduleUrl: string): this;

  /**
   * Set the modal size preset.
   *
   * @param size - A `BunnyModalSize` preset.
   */
  setModalSize(size: BunnyConfig<TRow, TForm>["modalSize"]): this;

  /**
   * Set a custom modal width in pixels.
   *
   * @param width - Modal width in pixels.
   */
  setModalWidth(width: number): this;

  /**
   * Install a validation adapter (Zod, Yup, Joi, custom) that takes
   * precedence over built-in field-level rules.
   *
   * @param adapter - The `BunnyValidationAdapter` to use.
   */
  setValidationAdapter(adapter: BunnyValidationAdapter<TForm>): this;

  /**
   * Enable both default header actions and default row actions.
   */
  useDefault(): this;

  /**
   * Enable only the default row actions (view / edit / delete).
   */
  useDefaultRowActions(): this;

  /**
   * Wire the query and mutation objects in one call.
   *
   * @param options - `{ query, mutation }` to attach to the config.
   */
  useDataLayer(options: {
    query: AdminPanelQuery<TRow, TForm>;
    mutation: AdminPanelMutation<TForm>;
  }): this;

  /**
   * Configure the data layer through the fluent configurator.
   *
   * @param configure - Callback receiving an `IBunnyDataLayerConfigurator`.
   */
  configureDataLayer(
    configure: (configurator: IBunnyDataLayerConfigurator<TRow, TForm>) => void,
  ): this;

  /**
   * Configure the form through the fluent configurator.
   *
   * @param configure - Callback receiving an `IBunnyFormConfigurator`.
   */
  configureForm(
    configure: (configurator: IBunnyFormConfigurator<TRow, TForm>) => void,
  ): this;

  /**
   * Configure the table through the fluent configurator.
   *
   * @param configure - Callback receiving an `IBunnyTableConfigurator`.
   */
  configureTable(
    configure: (configurator: IBunnyTableConfigurator<TRow, TForm>) => void,
  ): this;

  /**
   * Configure the header through the fluent configurator.
   *
   * @param configure - Callback receiving an `IBunnyHeaderConfigurator`.
   */
  configureHeader(
    configure: (configurator: IBunnyHeaderConfigurator<TRow, TForm>) => void,
  ): this;

  /**
   * Configure row actions through the fluent configurator.
   *
   * @param configure - Callback receiving an `IBunnyRowConfigurator`.
   */
  configureRow(
    configure: (configurator: IBunnyRowConfigurator<TRow, TForm>) => void,
  ): this;

  /**
   * Configure the modal through the fluent configurator.
   *
   * @param configure - Callback receiving an `IBunnyModalConfigurator`.
   */
  configureModal(
    configure: (configurator: IBunnyModalConfigurator<TRow, TForm>) => void,
  ): this;
}
