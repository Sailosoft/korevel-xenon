import { useBunnyConfig } from "../context/BunnyContext";
import { BStack } from "../stack/BStack";
import BunnyHeaderActionComponent from "./BunnyHeader.Action.Component";
import { useBunnyHeaderMappedHeaderActions } from "./BunnyHeader.Action.Hooks";
import BunnyHeaderMoreAction from "./BunnyHeader.MoreAction.Component";
import { BTypography } from "../typography/BTypography";

export default function BunnyHeader() {
  const { titlePlural, header } = useBunnyConfig();
  const mappedHeaderActions = useBunnyHeaderMappedHeaderActions() || [];

  const variant = header?.variant ?? "default";
  const icon = header?.icon;
  const description = header?.description;

  // Split actions based on displayMode configuration
  const visibleActions = mappedHeaderActions.filter(
    (action) => action.displayMode !== "collapse",
  );
  const overflowActions = mappedHeaderActions.filter(
    (action) => action.displayMode === "collapse",
  );

  const actionsSlot = (
    <BStack direction="row" alignItems="center" gap={3}>
      {visibleActions.map((action, index) => (
        <BunnyHeaderActionComponent key={action.id || index} action={action} />
      ))}
      {overflowActions.length > 0 && (
        <BunnyHeaderMoreAction actions={overflowActions} />
      )}
    </BStack>
  );

  if (variant === "detailed") {
    return (
      <BStack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        gap={4}
        sx={{ p: 3, pb: 4 }}
      >
        <div className="flex items-center gap-3">
          {icon && (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shrink-0">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-slate-800">{titlePlural}</h1>
            {description && (
              <p className="text-sm text-slate-400">{description}</p>
            )}
          </div>
        </div>

        {actionsSlot}
      </BStack>
    );
  }

  // Default variant — original behavior
  return (
    <BStack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      gap={4}
      sx={{ p: 3, pb: 4 }}
    >
      <BTypography variant="h4">{titlePlural}</BTypography>

      {actionsSlot}
    </BStack>
  );
}
