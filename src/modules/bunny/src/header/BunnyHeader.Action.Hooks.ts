import { useBunnyConfig } from "../context/BunnyContext";

export const useBunnyHeaderMappedHeaderActions = () => {
  const { headerActions } = useBunnyConfig();
  return headerActions;
};
