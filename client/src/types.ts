export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'system';
  timestamp: Date;
  options?: string[];
  agent?: Record<string, unknown>;
  summary?: Record<string, unknown>;
}
