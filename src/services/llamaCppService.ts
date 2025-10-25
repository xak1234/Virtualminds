/// <reference types="vite/client" />
// Llama.cpp (OpenAI-compatible) service client
// Calls a local server (e.g., llama.cpp or llama-cpp-python) via the OpenAI API schema
// Configure base URL via VITE_LLAMA_BASE_URL or rely on Vite proxy to /v1 in dev

export interface LlamaCppMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlamaCppConfig {
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
  model?: string; // optional, some servers let you route per request
}

export interface LlamaCppResponseChoice {
  index: number;
  message: { role: 'assistant'; content: string };
}

export interface LlamaCppChatCompletion {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: LlamaCppResponseChoice[];
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

const baseUrl = import.meta.env.VITE_LLAMA_BASE_URL?.replace(/\/$/, '') || '/v1';

async function post<T>(path: string, body: any, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Llama server error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function createChatCompletion(
  messages: LlamaCppMessage[],
  config: LlamaCppConfig = {},
  signal?: AbortSignal
): Promise<LlamaCppChatCompletion> {
  // llama.cpp server supports the OpenAI path /v1/chat/completions
  // If your server only provides /completion, switch accordingly.
  return post<LlamaCppChatCompletion>('/chat/completions', {
    messages,
    temperature: config.temperature ?? 0.7,
    top_p: config.top_p ?? 0.95,
    max_tokens: config.max_tokens ?? 512,
    stream: config.stream ?? false,
    model: config.model,
  }, signal);
}

export function formatChat(systemInstruction: string | undefined, history: { role: 'user' | 'assistant'; content: string }[], prompt: string): LlamaCppMessage[] {
  const messages: LlamaCppMessage[] = [];
  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  }
  for (const m of history) {
    messages.push(m);
  }
  messages.push({ role: 'user', content: prompt });
  return messages;
}
