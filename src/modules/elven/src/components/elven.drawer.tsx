import { Drawer, Button } from "@heroui/react";
import useElvenContext from "../hooks/use-elven-context";
import { ElvenNavigation } from "../interfaces/elven.interface";
import useElvenDrawer from "../hooks/use-elven-drawer";
import { ElvenTypography } from "./elven.typography";

export default function ElvenDrawer() {
  const { header } = useElvenContext();

  const { navs } = useElvenDrawer();
  return (
    <Drawer.Backdrop
      isOpen={header.isDrawerOpen}
      onOpenChange={header.toggleDrawer}
    >
      <Drawer.Content placement="left">
        <Drawer.Dialog>
          <Drawer.Handle /> {/* Optional: Drag handle */}
          <Drawer.CloseTrigger /> {/* Optional: Close button */}
          <Drawer.Header>
            <Drawer.Heading>
              <ElvenTypography variant="title-large">Elven AI</ElvenTypography>
            </Drawer.Heading>
          </Drawer.Header>
          <Drawer.Body>
            <nav className="flex flex-col gap-1">
              {navs.map((item) => (
                <button
                  key={item.title}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-default"
                  type="button"
                  onClick={item.action}
                >
                  {item.title}
                </button>
              ))}
            </nav>
          </Drawer.Body>
          <Drawer.Footer />
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  );
}
