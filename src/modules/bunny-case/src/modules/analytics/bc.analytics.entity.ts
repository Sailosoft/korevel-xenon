// bc.analytics.entity.ts
//
// Sentiment Analytics types. Identifies the path taken to resolve a
// case and which specific words caused the customer's mood to shift from
// negative to positive.

export interface BCWordSentiment {
  word: string;
  impact: number;
  shift: "positive" | "negative";
}

export interface BCAnalyticsData {
  sessionId: number;
  personaName: string;
  caseTitle: string;
  resolved: boolean;
  mode: string;
  sentimentTrend: number[];
  shiftWords: BCWordSentiment[];
  recommendedPhrases: string[];
  summary: string;
}
