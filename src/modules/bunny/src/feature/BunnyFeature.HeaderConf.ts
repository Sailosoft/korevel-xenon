import { BunnyConfig } from "../Bunny.Interface";
import {
  BunnyHeaderAction,
  BunnyHeaderActionType,
  BunnyHeaderConfig,
} from "../header/BunnyHeader.Interface";

export class BunnyHeaderConfigurator<TRow, TForm> {
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

  /**
   * Sets the header display configuration (icon, description, variant).
   *
   * @param config - Partial header config to merge onto the existing settings.
   *
   * @example
   * ```ts
   * feature.configureHeader((header) => {
   *   header.setConfig({
   *     description: "Manage your workflow templates",
   *     variant: "detailed",
   *   });
   * });
   * ```
   */
  public setConfig(config: Partial<BunnyHeaderConfig>): this {
    this.config.header = {
      ...(this.config.header ?? {}),
      ...config,
    } as BunnyHeaderConfig;
    return this;
  }
}
