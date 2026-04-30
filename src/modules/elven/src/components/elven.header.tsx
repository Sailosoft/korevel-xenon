import { Card } from "@heroui/react";
import { Button } from "@heroui/react";
import { Menu } from "lucide-react";
import { ElvenStack } from "./elven.stack";
import { ElvenTypography } from "./elven.typography";
import useElvenContext from "../hooks/use-elven-context";

export default function ElvenHeader() {
  const { header } = useElvenContext();
  return (
    <Card className="p-4">
      <ElvenStack direction="row" gap={2} alignItems="center">
        <Button isIconOnly variant="primary" onPress={header.toggleDrawer}>
          <Menu />
        </Button>
        <ElvenTypography variant="display-medium">Elven AI</ElvenTypography>
      </ElvenStack>
    </Card>
  );
}
