import { useEffect } from 'react';
import { useBunnyKernel } from "../kernel";
import BunnyDialog from "./BunnyDialog";

export default function BunnyDialogAction() {
  const kernel = useBunnyKernel();
  return <BunnyDialog dialog={kernel.adminPanel.dialog} context={kernel} />;
}
