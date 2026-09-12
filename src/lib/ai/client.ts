/**
 * OpenAI client — a thin wrapper, not a framework. Two established patterns
 * this follows exactly: `isStripeEnabled()` for the on/off switch, and
 * send.ts's "no key → log what it would have done and carry on" for
 * degradation. Every caller must check `isAiEnabled()` before calling
 * `callOpenAiJson` — this file does not silently no-op, it throws, because a
 * caller that forgot the check is a bug worth surfacing, not swallowing.
 */

export function isAiEnabled(): boolean {
  return import.meta.env.AI_ENABLED === 'true' && Boolean(import.meta.env.OPENAI_API_KEY);
}

export class AiError extends Error {
  constructor(public code: string, message?: string) {
    super(message ?? code);
  }
}

const MODEL = 'gpt-4o-mini';
const DEFAULT_TIMEOUT_MS = 25_000;

/**
 * One strict-JSON-schema call, one retry, a hard timeout and a token cap.
 * Vercel's function timeout is why this must never be called from inside a
 * public form's POST handler — the caller (an admin action, never the
 * public submission endpoint) is what makes a 25s worst case acceptable.
 */
export async function callOpenAiJson<T>(opts: {
  system: string;
  user: string;
  schema: Record<string, unknown>;
  schemaName: string;
  maxTokens?: number;
  timeoutMs?: number;
}): Promise<T> {
  if (!isAiEnabled()) throw new AiError('ai-disabled');
  const key = import.meta.env.OPENAI_API_KEY;

  const attempt = async (): Promise<T> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: opts.system },
            { role: 'user', content: opts.user },
          ],
          max_tokens: opts.maxTokens ?? 900,
          response_format: {
            type: 'json_schema',
            json_schema: { name: opts.schemaName, schema: opts.schema, strict: true },
          },
        }),
        signal: controller.signal,
      });
      if (!res.ok) throw new AiError(`openai-${res.status}`, await res.text().catch(() => ''));
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (typeof content !== 'string') throw new AiError('openai-empty-response');
      return JSON.parse(content) as T;
    } finally {
      clearTimeout(timeout);
    }
  };

  try {
    return await attempt();
  } catch (firstError) {
    try {
      return await attempt();
    } catch {
      throw firstError;
    }
  }
}
