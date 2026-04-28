import { useState } from "react";
import { UseElvenModal } from "../interfaces/elven.hooks.interface";

export default function useElvenModal(): UseElvenModal {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = () => {
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
  };

  return {
    isOpen,
    openModal,
    closeModal,
  };
}
