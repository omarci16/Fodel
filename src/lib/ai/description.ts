/**
 * Description-rewrite suggestion. On demand only (a "Szövegjavaslat" button
 * in the property editor) — never automatically on submit, and never inside
 * the public form's POST, for the same Vercel-timeout reason as the
 * valuation adjustment. Stored `pending`; it never writes to
 * property_translations on its own — see the accept/reject actions in
 * src/pages/api/portal/properties/[id]/ai-suggestion.ts.
 */
import { callOpenAiJson, isAiEnabled, AiError } from './client';

export type DescriptionFields = {
  title: string;
  subtitle: string | null;
  description: string;
  body: string;
};

export type DescriptionSuggestion = DescriptionFields & { issues: string[] };

const SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    subtitle: { type: 'string' },
    description: { type: 'string' },
    body: { type: 'string' },
    issues: { type: 'array', items: { type: 'string' } },
  },
  required: ['title', 'subtitle', 'description', 'body', 'issues'],
  additionalProperties: false,
};

const LOCALE_NAME: Record<string, string> = { hu: 'Hungarian', nl: 'Dutch' };

export async function suggestDescription(
  locale: string,
  fields: DescriptionFields
): Promise<DescriptionSuggestion> {
  if (!isAiEnabled()) throw new AiError('ai-disabled');

  const language = LOCALE_NAME[locale] ?? locale;
  const system =
    `You improve real-estate listing copy for a Hungarian agency, written entirely in ${language} — ` +
    'never translate or switch language. Fix grammar, clarity and flow; make it read like a professional ' +
    'listing. Strict rules, all mandatory: 1) invent NO fact not present in the input (no room counts, ' +
    'distances, dates, or features not stated); 2) make NO price or investment claim of any kind; ' +
    '3) use NO superlative claim about the neighbourhood or area (never "best", "most sought-after", ' +
    'etc.) unless the input already states it as fact; 4) keep each field within roughly the same length ' +
    'as the input (title under 80 chars, description under 300 chars, body under 1500 chars). ' +
    'List every change you made as short factual notes in "issues" (e.g. "fixed grammar in paragraph 2", ' +
    'never a compliment about your own output).';

  const user = JSON.stringify(fields);

  const result = await callOpenAiJson<DescriptionSuggestion>({
    system,
    user,
    schema: SCHEMA,
    schemaName: 'description_suggestion',
    maxTokens: 1400,
  });

  return {
    title: result.title.slice(0, 120),
    subtitle: result.subtitle?.slice(0, 160) || null,
    description: result.description.slice(0, 400),
    body: result.body.slice(0, 3000),
    issues: result.issues,
  };
}
