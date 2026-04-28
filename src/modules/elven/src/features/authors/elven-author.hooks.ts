import { UseElvenAuthor } from "./elven-author.interface";
import useElvenModal from "../../hooks/use-elven-modal";

export function useElvenAuthor(): UseElvenAuthor {
  const modal = useElvenModal();
  return {
    modal,
  };
}
