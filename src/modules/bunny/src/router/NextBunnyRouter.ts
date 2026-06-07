import { useRouter as useNextRouter } from "next/navigation";
import { BunnyRouter } from "./BunnyRouter.interface";

export function useNextBunnyRouter(): BunnyRouter {
  const nextRouter = useNextRouter();

  return {
    push: (href) => nextRouter.push(href),
    replace: (href) => nextRouter.replace(href),
    back: () => nextRouter.back(),
  };
}