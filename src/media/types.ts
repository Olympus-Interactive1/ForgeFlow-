import type { ModelRequest, ModelResponse } from '../core/types.js';

export interface ImageGenerateRequest extends ModelRequest { capability: 'image'; }
export interface ImageEditRequest extends ImageGenerateRequest { input: { image: string; mask?: string }; }
export interface VideoGenerateRequest extends ModelRequest { capability: 'video'; }
export interface AudioGenerateRequest extends ModelRequest { capability: 'audio'; }
export interface SpeechToTextRequest extends ModelRequest { capability: 'stt'; input: { audio: string }; }
export interface TextToSpeechRequest extends ModelRequest { capability: 'tts'; prompt: string; }

export type ImageResult = ModelResponse<{ url?: string; data?: string }>;
export type VideoResult = ModelResponse<{ url?: string; data?: string }>;
export type AudioResult = ModelResponse<{ url?: string; data?: string }>;
export type SpeechResult = ModelResponse<{ text: string }>;
