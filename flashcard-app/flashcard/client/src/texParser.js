/**
 * Parse a LaTeX document into question blocks.
 * Supports two formats:
 * - Block with \begin{enumerate}: first \item = question, following \items = statements, then (a)-(d) options.
 * - Block with "N. Question text" then optional enumerate then (a)-(d).
 * Splits document by numbered question starts (\n2. , \n3. , ...) so each block is one question.
 */

function extractBody(tex) {
  const docStart = tex.indexOf('\\begin{document}');
  const docEnd = tex.indexOf('\\end{document}');
  if (docStart === -1 || docEnd === -1 || docEnd <= docStart) return tex;
  return tex.slice(docStart + '\\begin{document}'.length, docEnd).trim();
}

/** Extract options (a)-(d) from the end of a block; returns { options, rest } */
function extractOptions(block) {
  const options = {};
  const lines = block.split(/\r?\n/);
  let optionsStart = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^\s*\(([a-d])\)\s*(.*)$/i);
    if (match) {
      if (optionsStart === -1) optionsStart = i;
      options[match[1].toLowerCase()] = match[2].trim().replace(/\\\\\s*$/, '');
    }
  }

  if (Object.keys(options).length === 0) return { options: undefined, rest: block };

  const rest = optionsStart >= 0
    ? lines.slice(0, optionsStart).join('\n').trim()
    : block;
  return { options, rest };
}

/** Get content between first \begin{enumerate} and matching \end{enumerate} */
function extractEnumerateContent(block) {
  const start = block.indexOf('\\begin{enumerate}');
  if (start === -1) return null;
  const afterStart = block.indexOf('\\end{enumerate}', start);
  if (afterStart === -1) return null;
  const inner = block.slice(start + '\\begin{enumerate}'.length, afterStart).trim();
  return { inner, before: block.slice(0, start).trim(), after: block.slice(afterStart + '\\end{enumerate}'.length).trim() };
}

/** Split by \item and return array of item texts (trimmed) */
function splitItems(enumerateInner) {
  const parts = enumerateInner.split(/\s*\\item\s+/).map((s) => s.trim()).filter(Boolean);
  return parts;
}

/**
 * Parse one question block into { question, statements, options }.
 * Block may be: " \begin{enumerate} \item Q \item S1 \item S2 \end{enumerate} Select... (a)... "
 * or: "The quality... \n\n\begin{enumerate} \item S1 \item S2 \end{enumerate} Select... (a)... "
 */
function parseBlock(block, isFirstBlock) {
  const { options, rest } = extractOptions(block);
  const content = rest;

  const enumMatch = extractEnumerateContent(content);
  if (enumMatch) {
    const { inner, before, after } = enumMatch;
    const items = splitItems(inner);
    if (items.length === 0) return { question: before || content, statements: undefined, options };

    if (isFirstBlock && !before) {
      // First block with no text before enumerate: first \item = question, rest = statements
      const question = items[0];
      const statements = items.slice(1);
      return { question, statements: statements.length ? statements : undefined, options };
    }

    // Text before enumerate = question; all \items = statements
    const question = before || items[0];
    const statements = before ? items : items.slice(1);
    return {
      question,
      statements: statements.length ? statements : undefined,
      options,
    };
  }

  // No enumerate: whole content (before we stripped options) is question
  const question = content.replace(/\s*\\\\\s*$/g, '').trim();
  return { question, statements: undefined, options };
}

/**
 * Parse .tex content into { title, questions } for import.
 * Sends question (main text + numbered statements + "Select...") and options; server builds full front.
 */
export function parseTexToQuestions(tex, fileName = '') {
  const body = extractBody(tex);
  const title = fileName.replace(/\.tex$/i, '').trim() || 'LaTeX Import';

  // Split by newline + digits + dot + space (start of next question). Keeps first block as-is.
  const blockRegex = /\n\s*\d+\.\s+/;
  const parts = body.split(blockRegex).map((s) => s.trim()).filter(Boolean);

  const questions = [];
  for (let i = 0; i < parts.length; i++) {
    const block = parts[i];
    const isFirstBlock = i === 0;
    const { question, statements, options } = parseBlock(block, isFirstBlock);
    if (!question) continue;

    let questionText = question;
    if (statements && statements.length) {
      questionText += '\n\n' + statements.map((s, j) => `${j + 1}. ${s}`).join('\n');
    }
    questionText += '\n\nSelect the correct answer using the code given below :';

    questions.push({
      question_number: i + 1,
      question: questionText,
      options: options && Object.keys(options).length ? options : undefined,
    });
  }

  return { title, questions };
}
