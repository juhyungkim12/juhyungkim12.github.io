/** Match whole author tokens, never a name embedded in another author's name. */
export function authorSegments(value: string | null | undefined) {
  const source = typeof value === 'string' ? value : '';
  // Keep separators so punctuation, whitespace and CMS text remain unchanged.
  const tokens = source.split(/([,;\r\n]+|\band\b|&|(?<![\p{L}\p{N}_])Equal contribution(?![\p{L}\p{N}_]))/u);
  const segments: {text: string; emphasized: boolean}[] = [];
  for (const token of tokens) {
    if (!token) continue;
    if (token === 'Equal contribution') {
      segments.push({text: token, emphasized: true});
      continue;
    }
    // J. T. Kim is a different author and is deliberately not an alias here.
    const author = token.match(/^(\s*)(Juhyung Kim|J\. Kim)([†‡*]*)(\s*)$/u);
    if (!author) {
      segments.push({text: token, emphasized: false});
      continue;
    }
    if (author[1]) segments.push({text: author[1], emphasized: false});
    segments.push({text: author[2] + author[3], emphasized: true});
    if (author[4]) segments.push({text: author[4], emphasized: false});
  }
  return segments;
}
