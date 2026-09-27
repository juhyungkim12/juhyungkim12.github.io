/** Split plain text into escaped Astro text nodes; never render CMS text as HTML. */
export function authorSegments(value: string | null | undefined) {
  const source = typeof value === 'string' ? value : '';
  const pattern = /(?<![\p{L}\p{N}_])(?:Juhyung Kim|J\. T\. Kim|J\. Kim|Equal contribution)(?![\p{L}\p{N}_])/gu;
  const segments: {text: string; emphasized: boolean}[] = [];
  let start = 0;
  for (const match of source.matchAll(pattern)) {
    if (match.index > start) segments.push({text: source.slice(start, match.index), emphasized: false});
    segments.push({text: match[0], emphasized: true});
    start = match.index + match[0].length;
  }
  if (start < source.length) segments.push({text: source.slice(start), emphasized: false});
  return segments;
}
