import { useMemo } from "react";
import { ElvenNavigation } from "../interfaces/elven.interface";
import useElvenContext from "./use-elven-context";

export default function useElvenDrawer(): { navs: ElvenNavigation[] } {
  const { author } = useElvenContext();
  const navs: ElvenNavigation[] = useMemo(
    () => [
      {
        title: "Author",
        action: () => {
          author.modal.openModal();
          console.log("Author");
        },
      },
      {
        title: "Skills",
        action: () => {
          console.log("Skills");
        },
      },
      {
        title: "Books",
        action: () => {
          console.log("Books");
        },
      },
    ],
    [],
  );
  return { navs };
}
