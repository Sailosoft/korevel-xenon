import { useBunnyConfig } from "../context/BunnyContext";
import { BStack } from "../stack/BStack";
import BunnyHeaderActionComponent from "./BunnyHeader.Action.Component";
import { useBunnyHeaderMappedHeaderActions } from "./BunnyHeader.Action.Hooks";
import BunnyHeaderMoreAction from "./BunnyHeader.MoreAction.Component";
import { BTypography } from "../typography/BTypography";

export default function BunnyHeader() {
  const { titlePlural } = useBunnyConfig();
  const mappedHeaderActions = useBunnyHeaderMappedHeaderActions() || [];

  // Split actions based on displayMode configuration
  const visibleActions = mappedHeaderActions.filter(
    (action) => action.displayMode !== "collapse",
  );
  const overflowActions = mappedHeaderActions.filter(
    (action) => action.displayMode === "collapse",
  );

  return (
    <BStack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      gap={4}
      sx={{ p: 3, pb: 4 }}
    >
      <BTypography variant="h4">{titlePlural}</BTypography>

      <BStack direction="row" alignItems="center" gap={3}>
        {/* Regular Header Actions */}
        {visibleActions.map((action, index) => (
          <BunnyHeaderActionComponent
            key={action.id || index}
            action={action}
          />
        ))}

        {/* Separated More/Overflow Action Dropdown */}
        {overflowActions.length > 0 && (
          <BunnyHeaderMoreAction actions={overflowActions} />
        )}
      </BStack>
    </BStack>
  );
}
