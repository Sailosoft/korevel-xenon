import { AdminPanelResult } from '../../shared/admin-panel-result';
import { AdminPanelFormMode } from '../form/admin-panel-form.interface';

export interface AdminPanelEventFormSuccessPayload<TForm> {
    result: AdminPanelResult<TForm, unknown>;
    mode?: AdminPanelFormMode;
  }