import mitt from "mitt";
import { AdminPanelFormMode } from "../form/admin-panel-form.interface";
import { AdminPanelResult } from "../../shared/admin-panel-result";
import { AdminPanelEventFormSuccessPayload } from './admin-panel-event.interface';

type AdminPanelEvents = {
  "del:success": void;
  "form:success": AdminPanelEventFormSuccessPayload<unknown>;
  "form:error": {
    error: any;
    mode?: AdminPanelFormMode;
    result: AdminPanelResult<any, any>;
  };
  "form:submit": {
    result: AdminPanelResult<any, any>;
    mode?: AdminPanelFormMode;
  };
  "form:beforeSubmit": { payload: any; mode?: AdminPanelFormMode };
  "table:refresh": void;
  notify: { message: string; type: "success" | "error" };
};

export const adminPanelEvents = mitt<AdminPanelEvents>();
