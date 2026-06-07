export interface BunnyRouter {
  push: (href: string) => void;
  replace: (href: string) => void;
  back: () => void;
  // Add query parsing or path params tracking here if needed later
}