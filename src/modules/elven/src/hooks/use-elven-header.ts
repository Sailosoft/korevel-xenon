import { useState } from "react";
import { UseElvenHeader } from "../interfaces/elven.hooks.interface";
import { ElvenNavigation } from "../interfaces/elven.interface";

export default function useElvenHeader(): UseElvenHeader {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  return {
    isDrawerOpen,
    toggleDrawer,
  };
}
