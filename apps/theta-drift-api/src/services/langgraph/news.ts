export function newsBlock(title: string, body: string): string {
  return `HEADLINE: ${title}\n\nBODY: ${body.trim() || '(none provided)'}`;
}
