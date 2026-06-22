import { BunnyConfig } from "../Bunny.Interface";
import { BunnyRowDefaultActions } from "../rows/BunnyRow.Interface";
import { BunnyRowAction } from "../table/BunnyTable.Interface";

export class BunnyRowConfigurator<TRow, TForm> {
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
