import { BunnyConfig } from "../Bunny.Interface";
import {
  BunnyHeaderAction,
  BunnyHeaderActionType,
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
}
