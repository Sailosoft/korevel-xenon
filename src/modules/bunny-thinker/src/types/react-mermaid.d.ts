declare module "react-mermaid" {
  import React from "react";

  interface MermaidProps {
    /** Optional identifier for the diagram element */
    name?: string;
    /** Mermaid diagram source code passed as children */
    children: string;
  }

  /**
   * Renders a Mermaid diagram from the diagram source code passed as children.
   */
  const Mermaid: React.FC<MermaidProps>;

  export default Mermaid;
}
