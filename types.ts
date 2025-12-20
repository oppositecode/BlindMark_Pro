export enum WatermarkType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  BINARY = 'BINARY'
}

export interface WatermarkConfig {
  type: WatermarkType;
  text?: string;
  image?: string; // base64
  binary?: string; // binary string '10101...'
  strength: number; // Embedding strength
}

export type ProcessStatus = 'idle' | 'processing' | 'success' | 'error';

export interface WorkerMessage {
  type: 'EMBED' | 'EXTRACT';
  imageData: ImageData;
  watermarkData?: number[]; // Bit array
  config?: {
    strength: number;
    watermarkWidth?: number;
    watermarkHeight?: number;
  };
}

export interface WorkerResponse {
  type: 'EMBED_RESULT' | 'EXTRACT_RESULT' | 'ERROR';
  imageData?: ImageData;
  extractedBits?: number[];
  confidence?: number;
  error?: string;
}
