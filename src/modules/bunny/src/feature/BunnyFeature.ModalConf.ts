import { BunnyConfig, BunnyModalSize } from "../Bunny.Interface";
import { BunnyModalHeaderAction } from "../modal/BunnyModal.Interface";

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

  /**
   * Replace all modal header action buttons with a new set.
   */
  public setModalHeaderActions(
    actions: BunnyModalHeaderAction<TRow, TForm>[],
  ): this {
    this.config.modalHeaderActions = actions;
    return this;
  }

  /**
   * Append a single modal header action button.
   */
  public addModalHeaderAction(
    action: BunnyModalHeaderAction<TRow, TForm>,
  ): this {
    if (!this.config.modalHeaderActions) {
      this.config.modalHeaderActions = [];
    }
    this.config.modalHeaderActions.push(action);
    return this;
  }
}
