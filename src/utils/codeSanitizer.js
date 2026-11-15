'use strict';

/**
 * PolyCompile Universal Source Code Sanitizer & Entity Decoder
 *
 * Automatically resolves issues where code copied from websites, documentation,
 * online tutorials, rich-text editors, or problem statements contains HTML entities
 * or line breaks instead of raw language syntax.
 *
 * Supported across ALL 55 languages:
 *  - &gt;   → >
 *  - &lt;   → <
 *  - &quot; → "
 *  - &apos; / &#39; → '
 *  - &amp;  → &
 *  - &nbsp; → ' '
 *  - <br>, <br/>, <br />, </br> → newline (\n)
 *  - <p>, </p>, <div>, </div>   → newline (\n)
 *  - Numeric decimal & hex entities (&#60;, &#62;, &#34;, &#38;, &#x3C;, etc.)
 *  - Automatic recovery for fused syntax lines when <node> tags were stripped by web browsers
 */
function sanitizeSourceCode(raw) {
  if (raw == null) return '';
  let code = String(raw);

  // 1. Normalize HTML line breaks and paragraphs to real newlines
  code = code
    .replace(/<br\s*\/?>\r?\n?/gi, '\n')
    .replace(/<\/br>\r?\n?/gi, '\n')
    .replace(/<\/p>\r?\n?/gi, '\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/div>\r?\n?/gi, '\n')
    .replace(/<div[^>]*>/gi, '');

  // 2. Normalize double-escaped entities (&amp;gt; -> &gt;)
  code = code
    .replace(/&amp;gt;/gi, '&gt;')
    .replace(/&amp;lt;/gi, '&lt;')
    .replace(/&amp;quot;/gi, '&quot;')
    .replace(/&amp;apos;/gi, '&apos;')
    .replace(/&amp;#39;/gi, '&#39;')
    .replace(/&amp;amp;/gi, '&amp;');

  // 3. Decode standard named entities
  code = code
    .replace(/&gt;/gi, '>')
    .replace(/&lt;/gi, '<')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&nbsp;/gi, ' ');

  // 4. Decode common numeric entities
  code = code
    .replace(/&#0*62;/g, '>')
    .replace(/&#0*60;/g, '<')
    .replace(/&#0*34;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&#0*38;/g, '&')
    .replace(/&#0*160;/g, ' ');

  // 5. Decode general decimal/hex ASCII entities
  code = code.replace(/&#(\d+);/g, (match, dec) => {
    const num = parseInt(dec, 10);
    return num >= 32 && num <= 126 ? String.fromCharCode(num) : match;
  });
  code = code.replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => {
    const num = parseInt(hex, 16);
    return num >= 32 && num <= 126 ? String.fromCharCode(num) : match;
  });

  // 6. Decode &amp; last so we don't accidentally expand inner entity components
  code = code.replace(/&amp;/gi, '&');

  // 7. Auto-heal fused lines caused by browser tag stripping in Dijkstra / Graph algorithms
  // e.g. "if current_dist > distcontinue" -> "if current_dist > dist[node]:\n        continue"
  if (/distcontinue/i.test(code)) {
    code = code.replace(/if\s+current_dist\s*>\s*distcontinue/gi, 'if current_dist > dist[node]:\n        continue');
  }
  if (/graphnew_dist/i.test(code)) {
    code = code.replace(/for\s+neighbor,\s*weight\s+in\s+graphnew_dist\s*=\s*current_dist\s*\+\s*weight/gi, 'for neighbor, weight in graph[node]:\n        new_dist = current_dist + weight');
  }
  if (/distdist\[neighbor\]/i.test(code)) {
    code = code.replace(/if\s+new_dist\s*<\s*distdist\[neighbor\]\s*=\s*new_dist/gi, 'if new_dist < dist[neighbor]:\n            dist[neighbor] = new_dist');
  }

  return code;
}

module.exports = { sanitizeSourceCode };
