import {
  AdminPanelFormMode,
  UseAdminPanelForm,
} from "@/src/modules/admin-panel/features/form/admin-panel-form.interface";
import { BunnyConfig, BunnyOnSuccessBehavior } from "../Bunny.Interface";
import { BunnyFormConfig, BunnyFormField } from "../form/BunnyForm.Interface";
import { IBunnyFormConfigurator } from "./BunnyFeature.Interface";

export class BunnyFormConfigurator<TRow, TForm>
  implements IBunnyFormConfigurator<TRow, TForm>
{
  constructor(private config: BunnyConfig<TRow, TForm>) {
    if (!this.config.props) this.config.props = {};
    if (!this.config.props.form) this.config.props.form = {};
    this.setGridCols(1);
  }

  public configureProps(
    props: NonNullable<NonNullable<BunnyConfig<TRow, TForm>["props"]>["form"]>,
  ): this {
    this.config.props!.form = { ...this.config.props!.form, ...props };
    return this;
  }

  public setOnSuccess(onSuccess: BunnyOnSuccessBehavior): this {
    this.config.onFormSuccess = onSuccess;
    return this;
  }

  public setBeforeSubmit(
    beforeSubmit: (form: Partial<TForm>, mode: AdminPanelFormMode) => TForm,
  ): this {
    this.config.beforeFormSubmit = beforeSubmit;
    return this;
  }

  /**
   * Define the form fields that will be rendered by BunnyFormBuilder.
   * Accepts an array of BunnyFormField objects — the primary way to
   * configure form controls through the fluent API.
   */
  public addFields(fields: BunnyFormField<TForm>[]): this {
    const raw = this.config.formConfig;
    if (!raw) {
      // Initialize as a plain config object (not a function)
      this.config.formConfig = { fields: [...fields] };
    } else if (typeof raw !== "function") {
      // Already a plain config object — append fields
      (this.config.formConfig as BunnyFormConfig<TForm>).fields.push(...fields);
    }
    return this;
  }

  /**
   * Set the number of grid columns for the form layout (default: 1).
   */
  public setGridCols(cols: number): this {
    const raw = this.config.formConfig;
    if (!raw) {
      this.config.formConfig = { fields: [], gridCols: cols };
    } else if (typeof raw !== "function") {
      (this.config.formConfig as BunnyFormConfig<TForm>).gridCols = cols;
    }
    return this;
  }

  /**
   * Pre-populate default form data when the modal opens in "create" mode.
   *
   * Call this to provide sensible defaults that match the workflow schema,
   * reducing manual input for repetitive fields. The data is applied every
   * time a new create modal is opened.
   *
   * @param data Partial form data with default values for one or more fields.
   *
   * @example
   * ```ts
   * form.setFormDefaultData({
   *   status: "draft",
   *   templateYaml: `name: my-workflow\nversion: 1.0.0\n`,
   * });
   * ```
   */
  public setFormDefaultData(data: Partial<TForm>): this {
    this.config.formDefaultData = data;
    // Also pipe through the existing initialData mechanism so the admin panel
    // form hook picks it up on resetForm() (runs when modal opens in "create" mode).
    // For "update"/"view" modes, loadData() overwrites with API data anyway.
    if (!this.config.props) this.config.props = {};
    if (!this.config.props.form) this.config.props.form = {};
    this.config.props.form.initialData = data;
    return this;
  }
}
