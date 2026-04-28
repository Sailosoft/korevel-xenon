import { ElvenContextType } from "../interfaces/elven.hooks.interface";
import useElvenHeader from "./use-elven-header";
import { useElvenAuthor } from "../features/authors/elven-author.hooks";
import { useMemo } from "react";
import ElvenDB from "../elven.db";

export default function useElven(): ElvenContextType {
  const header = useElvenHeader();
  const author = useElvenAuthor();
  const db = useMemo(() => new ElvenDB(), []);
  return { header, author, db };
}
