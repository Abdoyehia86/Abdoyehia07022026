
export interface PartEntry {
  Part: string;
  Website: string;
}

export interface ProcessedPart extends PartEntry {
  Link: string;
  Lifecycle: string;
  Datasheet: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
}

export interface GeminiResponse {
  link: string;
  lifecycle: string;
  datasheet: string;
}
