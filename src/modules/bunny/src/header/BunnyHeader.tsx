import { Text } from "@heroui/react";
import { useBunnyConfig } from "../context/BunnyContext";
import { BStack } from "../stack/BStack";
import BunnyHeaderActionComponent from "./BunnyHeader.Action.Component";
import { useBunnyHeaderMappedHeaderActions } from "./BunnyHeader.Action.Hooks";

export default function BunnyHeader() {
  const { titlePlural } = useBunnyConfig();
  const mappedHeaderActions = useBunnyHeaderMappedHeaderActions();
  return (
    <BStack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      gap={4}
      sx={{ p: 3, pb: 4 }}
    >
      <Text type="h2">{titlePlural}</Text>
      <BStack direction="row" alignItems="center" gap={3}>
        {mappedHeaderActions?.map((action, index) => (
          <BunnyHeaderActionComponent key={index} action={action} />
        ))}
      </BStack>
    </BStack>
  );
}
