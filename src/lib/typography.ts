/**
 * Splits an opening quotation mark off a quote, so the page can hang it in
 * the margin (`.hang-quote`, global.css) and the words line up with the text
 * around them. Returns an empty mark when the text doesn't open with one.
 */
export function splitOpeningQuote(text: string): { mark: string; rest: string } {
  return /^[„“"«‘]/.test(text) ? { mark: text[0], rest: text.slice(1) } : { mark: '', rest: text };
}
