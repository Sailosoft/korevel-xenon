interface BUIConfigAI {
  model: string;
  endpoint: string;
  apiKey: string;
}

export interface BUIConfig {
  ai: BUIConfigAI;
}
