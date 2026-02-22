/**
 * Parse plain text / markdown with numbered questions and bullet statements/options.
 * Format:
 * - "1. Question text" or "- 1. Question text" or "**18.** Question text"
 * - Optional statement lines: "  - Statement" or "- 2. Statement"
 * - Optional "Select the correct answer using the code given below:"
 * - Options: "  - (a) ..." or "(a) ..." etc.
 * Returns { title, questions } compatible with import API.
 */

/** Match line that starts a new question: "2. " or "- 2. " or "**18.** " at line start. Bold form is asterisks + digits + dot + asterisks. */
const QUESTION_START = /^\s*(-\s*)?(\*+\d+\.\*+|\d+\.)\s+/;

/** Same but only when line is not an indented bullet (no "  - N. "). Do not treat "- 1." through "- 9." as question start (they are statements). */
const QUESTION_START_STRICT = /(?:^|\n)(?!\s{2,}-\s*\d+\.)\s*(-\s*)?(\*+\d+\.\*+|\d+\.)\s+/g;

/** Match option line: optional bullet, then (a)-(d) */
const OPTION_LINE = /^\s*(-\s*)?\(([a-d])\)\s*(.*)$/i;

/** Match "Select the correct answer..." (to strip from content) */
const SELECT_LINE = /^\s*Select the correct answer[\s\S]*?:\s*$/i;

function findQuestionStarts(text) {
  const indices = [];
  let m;
  QUESTION_START_STRICT.lastIndex = 0;
  while ((m = QUESTION_START_STRICT.exec(text)) !== null) {
    const matched = m[0];
    const isDashSingleDigit = /-\s*[1-9]\.\s+/.test(matched);
    if (isDashSingleDigit && indices.length > 0) continue;
    indices.push(m.index);
  }
  return indices;
}

/** Strip leading "N. " or "- N. " or "**N.** " from first line to get question text */
function stripQuestionNumber(line) {
  return line.replace(QUESTION_START, '').trim();
}

/** Check if line is an option line (a)-(d) */
function isOptionLine(line) {
  return OPTION_LINE.test(line.trim());
}

/** True if line looks like a bullet (statement); trimmed line may be "- 2. Text" or "- Text" */
function isBulletLine(line) {
  return /^-\s*/.test(line.trim());
}

/** Parse one block into { question, statements, options } */
function parseBlock(block) {
  const lines = block.split(/\r?\n/).map((l) => l.trimEnd());
  const options = {};
  let optionsStart = -1;

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(OPTION_LINE);
    if (m) {
      if (optionsStart === -1) optionsStart = i;
      options[m[2].toLowerCase()] = m[3].trim();
    }
  }

  const restLines = optionsStart >= 0 ? lines.slice(0, optionsStart) : lines;
  const rest = restLines
    .filter((l) => !SELECT_LINE.test(l))
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (rest.length === 0) return { question: '', statements: undefined, options: Object.keys(options).length ? options : undefined };

  const firstLine = stripQuestionNumber(rest[0]);
  let questionLines = [firstLine];
  const statementLines = [];

  for (let i = 1; i < rest.length; i++) {
    const line = rest[i];
    const isOpt = isOptionLine(line);
    if (isOpt) continue;
    if (isBulletLine(rest[i])) {
      const content = line.replace(/^\s*-\s*(\d+\.\s*)?/, '').trim();
      if (content) statementLines.push(content);
    } else {
      questionLines.push(line);
    }
  }

  const question = questionLines.join('\n').trim();
  const statements = statementLines.length ? statementLines : undefined;

  return {
    question,
    statements,
    options: Object.keys(options).length ? options : undefined,
  };
}

/**
 * Parse text/markdown content into { title, questions } for import.
 * @param {string} text - Raw file content
 * @param {string} fileName - Optional filename for title
 */
export function parseTextToQuestions(text, fileName = '') {
  const trimmed = text.trim();
  const indices = findQuestionStarts(trimmed);
  const title = (fileName.replace(/\.(txt|md)$/i, '').trim()) || 'Text Import';

  if (indices.length === 0) return { title, questions: [] };

  const questions = [];
  for (let i = 0; i < indices.length; i++) {
    const start = indices[i];
    const end = indices[i + 1] ?? trimmed.length;
    const block = trimmed.slice(start, end).trim();
    const { question, statements, options } = parseBlock(block);
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
