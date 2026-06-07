import mitt from "mitt";
import { AdminPanelFormMode } from "../form/admin-panel-form.interface";
import { AdminPanelResult } from "../../shared/admin-panel-result";
import { AdminPanelEventFormSuccessPayload } from './admin-panel-event.interface';

type AdminPanelEvents = {
  "del:success": void;
  "form:success": AdminPanelEventFormSuccessPayload<unknown>;
  "form:error": {
    error: unknown;
    mode?: AdminPanelFormMode;
    result: AdminPanelResult<unknown, unknown>;
  };
  "form:submit": {
    result: AdminPanelResult<unknown, unknown>;
    mode?: AdminPanelFormMode;
  };
  "form:beforeSubmit": { payload: unknown; mode?: AdminPanelFormMode };
  "table:refresh": void;
  notify: { message: string; type: "success" | "error" };
};

export const adminPanelEvents = mitt<AdminPanelEvents>();
