import {
  AdminPanelFormMode,
  UseAdminPanelForm,
} from "@/src/modules/admin-panel/features/form/admin-panel-form.interface";
import { BunnyConfig, BunnyOnSuccessBehavior } from "../Bunny.Interface";
import { BunnyFormConfig, BunnyFormField } from "../form/BunnyForm.Interface";

export class BunnyFormConfigurator<TRow, TForm> {
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
}
