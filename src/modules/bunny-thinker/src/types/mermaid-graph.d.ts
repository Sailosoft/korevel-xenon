declare module "mermaid-graph" {
  import React from "react";

  interface MermaidGraphProps {
    graphCode: string;
    paths?: string[];
    onNodeClick?: (node: string) => void;
    onEdgeClick?: (edge: string) => void;
  }

  export const MermaidGraph: React.FC<MermaidGraphProps>;
}