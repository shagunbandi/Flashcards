import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

/**
 * Convert plain-text / calculator-style math to LaTeX for KaTeX.
 * Handles: ^( ) for superscript, sqrt( ), cos, sin, tan, pi, int, frac-like.
 */
function plainToLatex(str) {
  if (!str || typeof str !== 'string') return str;
  let s = str;

  // Superscript: ^(something) -> ^{something} (one level of parens)
  s = s.replace(/\^\(([^()]*)\)/g, '^{$1}');
  // Superscript: x^2 or x^n (single char/digit) -> x^{2}
  s = s.replace(/\^(\d+)/g, '^{$1}');
  s = s.replace(/\^([a-zA-Z])/g, '^{$1}');

  // sqrt(xxx) -> \sqrt{xxx}
  s = s.replace(/\bsqrt\s*\(([^()]*)\)/g, '\\sqrt{$1}');

  // Trig and constants (word boundaries so we don't break "clothes", "picture")
  s = s.replace(/\bcos\b/g, '\\cos');
  s = s.replace(/\bsin\b/g, '\\sin');
  s = s.replace(/\btan\b/g, '\\tan');
  s = s.replace(/\bpi\b/g, '\\pi');
  s = s.replace(/\bint\b/g, '\\int');
  s = s.replace(/\bsum\b/g, '\\sum');
  s = s.replace(/\bfrac\b/g, '\\frac');
  s = s.replace(/\btheta\b/g, '\\theta');
  s = s.replace(/\balpha\b/g, '\\alpha');
  s = s.replace(/\bbeta\b/g, '\\beta');
  s = s.replace(/\bgamma\b/g, '\\gamma');
  s = s.replace(/\bdelta\b/g, '\\delta');
  s = s.replace(/\bomega\b/g, '\\omega');
  s = s.replace(/\binfty\b/g, '\\infty');
  s = s.replace(/\bpartial\b/g, '\\partial');

  // Subscript: _(xxx) -> _{xxx}
  s = s.replace(/_\(([^()]*)\)/g, '_{$1}');
  s = s.replace(/_(\d+)/g, '_{$1}');
  s = s.replace(/_([a-zA-Z])/g, '_{$1}');

  // L^(-1) style
  s = s.replace(/\^\((-?\d+)\)/g, '^{$1}');
  s = s.replace(/L\^\{?\(?-1\)?\}?/g, 'L^{-1}');

  // Simple fraction: (num)/(den) -> \frac{num}{den} (one level)
  s = s.replace(/\(([^()]*)\)\s*\/\s*\(([^()]*)\)/g, '\\frac{$1}{$2}');

  return s;
}

/**
 * Find the index of the closing paren matching the open paren at openIdx.
 * Returns -1 if not found or unbalanced.
 */
function findMatchingParen(s, openIdx) {
  if (s[openIdx] !== '(') return -1;
  let depth = 1;
  for (let i = openIdx + 1; i < s.length; i++) {
    if (s[i] === '(') depth++;
    else if (s[i] === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Find the end of a balanced {...} starting at openIdx (s[openIdx] === '{').
 */
function findMatchingBrace(s, openIdx) {
  if (s[openIdx] !== '{') return -1;
  let depth = 1;
  for (let i = openIdx + 1; i < s.length; i++) {
    if (s[i] === '{') depth++;
    else if (s[i] === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Find the next math fragment start in s from index start: ^( or sqrt(
 * Returns { start, end } for the math substring, or null.
 * "start" is the first character of the formula (may include base like 2e or L before ^).
 */
function findNextMathFragment(s, fromIndex) {
  const re = /\^\(|\bsqrt\s*\(/g;
  re.lastIndex = fromIndex;
  const match = re.exec(s);
  if (!match) return null;
  const parenStart = match.index + match[0].length - 1;
  const closeIdx = findMatchingParen(s, parenStart);
  if (closeIdx === -1) return null;
  let fragEnd = closeIdx + 1;
  let after = fragEnd;
  while (after < s.length && /[\s]/.test(s[after])) after++;
  if (s[after] === '{') {
    const braceEnd = findMatchingBrace(s, after);
    if (braceEnd !== -1) fragEnd = braceEnd + 1;
  }
  let fragStart = match.index;
  const before = s.slice(Math.max(0, match.index - 20), match.index);
  const baseMatch = /[a-zA-Z0-9.]*$/.exec(before);
  if (baseMatch && baseMatch[0]) fragStart = match.index - baseMatch[0].length;
  return { start: fragStart, end: fragEnd };
}

/**
 * Split a single line into alternating text and math segments.
 * Only formula-like substrings (^(...), sqrt(...)) are treated as math.
 */
function splitLineIntoTextAndMath(line) {
  const segments = [];
  let pos = 0;
  while (pos < line.length) {
    const frag = findNextMathFragment(line, pos);
    if (!frag) {
      segments.push({ type: 'text', value: line.slice(pos) });
      break;
    }
    if (frag.start > pos) {
      segments.push({ type: 'text', value: line.slice(pos, frag.start) });
    }
    segments.push({ type: 'math', value: line.slice(frag.start, frag.end) });
    pos = frag.end;
  }
  return segments;
}

/**
 * Split content into segments of text and math.
 * Only formula parts (^(...), sqrt(...)) are rendered as math; everything else stays plain text.
 */
function splitTextAndMath(content) {
  if (!content || typeof content !== 'string') return [{ type: 'text', value: content }];
  const segments = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const newline = i < lines.length - 1 ? '\n' : '';
    if (!/\^\(|\bsqrt\s*\(/.test(line)) {
      segments.push({ type: 'text', value: line + newline });
      continue;
    }
    const lineSegs = splitLineIntoTextAndMath(line);
    for (let j = 0; j < lineSegs.length; j++) {
      segments.push(lineSegs[j]);
      if (j === lineSegs.length - 1) segments.push({ type: 'text', value: newline });
    }
  }
  return segments;
}

/**
 * Split content by LaTeX delimiters $...$ (inline) and $$...$$ (display).
 * Returns segments with type 'text' | 'math' (inline) | 'displaymath'.
 * Use when content comes from LaTeX / .tex so math is already in $ or $$.
 */
function splitByLatexDelimiters(content) {
  if (!content || typeof content !== 'string') return [];
  const segments = [];
  let pos = 0;
  const s = content;
  while (pos < s.length) {
    const dd = s.indexOf('$$', pos);
    const d = s.indexOf('$', pos);
    if (dd === -1 && d === -1) {
      segments.push({ type: 'text', value: s.slice(pos) });
      break;
    }
    if (dd !== -1 && (d === -1 || dd <= d)) {
      if (dd > pos) segments.push({ type: 'text', value: s.slice(pos, dd) });
      const end = s.indexOf('$$', dd + 2);
      if (end === -1) {
        segments.push({ type: 'text', value: s.slice(dd) });
        break;
      }
      segments.push({ type: 'displaymath', value: s.slice(dd + 2, end).trim() });
      pos = end + 2;
      continue;
    }
    if (d !== -1) {
      if (d > pos) segments.push({ type: 'text', value: s.slice(pos, d) });
      const end = s.indexOf('$', d + 1);
      if (end === -1) {
        segments.push({ type: 'text', value: s.slice(d) });
        break;
      }
      segments.push({ type: 'math', value: s.slice(d + 1, end).trim() });
      pos = end + 1;
    }
  }
  return segments;
}

/**
 * Split content into image and text segments using markdown image syntax ![alt](url).
 */
function splitByImages(content) {
  const segments = [];
  let lastIndex = 0;
  const re = /!\[([^\]]*)\]\(([^)\s"\\]+)\)/g;
  let match;
  while ((match = re.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: content.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'image', alt: match[1], src: match[2] });
    lastIndex = re.lastIndex;
  }
  if (lastIndex < content.length) {
    segments.push({ type: 'text', value: content.slice(lastIndex) });
  }
  return segments.length ? segments : [{ type: 'text', value: content }];
}

function renderMathSegments(segments, hasLatexDelimiters, keyPrefix = '') {
  return segments.map((seg, i) => {
    const key = `${keyPrefix}${i}`;
    if (seg.type === 'text') {
      return <span key={key} className="whitespace-pre-line">{seg.value}</span>;
    }
    const isDisplay = seg.type === 'displaymath';
    const latex = hasLatexDelimiters ? seg.value : plainToLatex(seg.value);
    try {
      const html = katex.renderToString(latex, { throwOnError: true, displayMode: isDisplay, output: 'html' });
      return <span key={key} className={isDisplay ? 'katex-block' : 'katex-inline'} dangerouslySetInnerHTML={{ __html: html }} />;
    } catch {
      return <span key={key} className="whitespace-pre-line">{seg.value}</span>;
    }
  });
}

/**
 * Render a string that may contain mixed text, math, and markdown images.
 * Images: ![alt](url) → <img> tags.
 * Math: $...$ / $$...$$ or ^(...) / sqrt(...) → KaTeX.
 */
function renderWithMath(content, className = '', options = {}) {
  if (!content) return null;

  const imageSegments = splitByImages(content);
  const out = [];

  for (let i = 0; i < imageSegments.length; i++) {
    const seg = imageSegments[i];
    if (seg.type === 'image') {
      out.push(
        <img
          key={i}
          src={seg.src}
          alt={seg.alt}
          className="max-w-full max-h-48 object-contain rounded my-1 block"
        />
      );
    } else {
      const hasLatexDelimiters = /\$/.test(seg.value);
      const mathSegs = hasLatexDelimiters
        ? splitByLatexDelimiters(seg.value)
        : splitTextAndMath(seg.value);
      out.push(...renderMathSegments(mathSegs, hasLatexDelimiters, `${i}-`));
    }
  }

  return <span className={className}>{out}</span>;
}

export default function MathContent({ content, className = '', inline = true }) {
  if (!content) return null;
  return renderWithMath(content, className, { inline });
}

export { plainToLatex, splitByLatexDelimiters, splitTextAndMath, renderWithMath };
