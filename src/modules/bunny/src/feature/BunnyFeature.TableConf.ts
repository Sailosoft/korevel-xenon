import { BunnyConfig } from "../Bunny.Interface";
import { BunnyColumn } from "../table/BunnyTable.Interface";

export class BunnyTableConfigurator<TRow, TForm> {
  constructor(private config: BunnyConfig<TRow, TForm>) {
    if (!this.config.props) this.config.props = {};
    if (!this.config.props.table) this.config.props.table = {};
  }

  public setHeight(height: string | number): this {
    this.config.tableHeight = height;
    return this;
  }

  public addColumns(columns: BunnyColumn<TRow>[]): this {
    const existingFields = new Set(this.config.columns.map((c) => c.field));
    const deduped = columns.filter((c) => !existingFields.has(c.field));
    this.config.columns = [...this.config.columns, ...deduped];
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
