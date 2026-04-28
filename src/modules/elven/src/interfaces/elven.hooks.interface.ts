import ElvenDB from "../elven.db";
import { UseElvenAuthor } from "../features/authors/elven-author.interface";

export interface UseElvenHeader {
  isDrawerOpen: boolean;
  toggleDrawer: () => void;
}

export interface ElvenContextType {
  header: UseElvenHeader;
  author: UseElvenAuthor;
  db: ElvenDB;
}

export interface UseElvenModal {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}
