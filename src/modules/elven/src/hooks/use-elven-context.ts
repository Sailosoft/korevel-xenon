import { ElvenContext } from "../elven.context";
import { useContext } from "react";

export default function useElvenContext() {
  const context = useContext(ElvenContext);
  if (!context) {
    throw new Error("useElvenContext must be used within an ElvenProvider");
  }
  return context;
}
