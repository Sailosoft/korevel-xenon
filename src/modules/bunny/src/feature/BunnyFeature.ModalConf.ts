import { BunnyConfig, BunnyModalSize } from "../Bunny.Interface";

/**
 * Modal configuration
 */
export class BunnyModalConfigurator<TRow, TForm> {
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
