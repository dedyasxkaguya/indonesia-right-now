export type SecretPageMode = 'safe' | 'truth';
export type CalmPreference = boolean;

export type SecretAggregate = {
  id: string;
  label: string;
  value: string;
  note: string;
};

export type SecretCaseKind = 'echo' | 'date-uncertain';

export type SecretCase = {
  id: string;
  kind: SecretCaseKind;
  headline: string;
  summary: string | null;
  publisher: string;
  publishedAt: string;
  sourceUrl: string;
  relatedPublishers: string[];
  relatedCount: number;
  dateConfidence: string;
};
