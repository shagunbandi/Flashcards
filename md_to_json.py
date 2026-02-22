#!/usr/bin/env python3
"""
Convert a messy PDF-extracted markdown file of MCQs into clean structured JSON.

Usage:
    python md_to_json.py output/GS-2022/GS-2022.md
    python md_to_json.py output/GS-2022/GS-2022.md --model gpt-4o-mini

Output:
    output/GS-2022/GS-2022.json  (same directory as the input file)

Requires:
    pip install openai
    export OPENAI_API_KEY=sk-...
"""

import argparse
import json
import os
import sys

from openai import OpenAI

SYSTEM_PROMPT = """You are an expert at parsing multiple-choice examination papers.

You will receive a markdown file extracted from a scanned PDF of an MCQ exam. The text
may have minor OCR/formatting issues: some statement numbers may be missing, extra dashes
or asterisks may appear, LaTeX math may be present (keep it as-is), and some questions may
span multiple paragraphs.

Your job is to extract every question and return a JSON object in this exact shape:

{
  "questions": [
    {
      "number": <integer question number>,
      "question": "<full question text, including any numbered sub-statements, preserving LaTeX and inline image references>",
      "options": {
        "a": "<option a text>",
        "b": "<option b text>",
        "c": "<option c text>",
        "d": "<option d text>"
      }
    }
  ]
}

Rules:
- Include ALL numbered sub-statements as part of the question text (e.g. "1. ... 2. ... 3. ...").
  Reconstruct missing statement numbers using context if needed.
- Strip leading dashes, asterisks, and bold markers from the question and option texts.
- Do NOT include "Select the correct answer using the code given below:" — that phrase is
  part of the question preamble, not the question itself.
- For Statement (I) / Statement (II) style questions, include both statements in the question field.
- Preserve LaTeX math exactly as written (e.g. $2e^{-3t}$, \\frac{...}{...}, etc.).
- If a question contains a markdown image reference (e.g. ![](_page_2_Figure_16.jpeg)), include it
  verbatim inside the "question" string at the position where it appears. Do NOT drop or alter image paths.
- Return ONLY valid JSON — no markdown fences, no extra commentary.
- The top-level value must be a JSON object with a "questions" key containing the array.
"""


def extract_questions_from_response(parsed: dict | list) -> list[dict]:
    if isinstance(parsed, dict):
        for key in ("questions", "items", "data", "results"):
            if key in parsed and isinstance(parsed[key], list):
                return parsed[key]
        for v in parsed.values():
            if isinstance(v, list):
                return v
        raise ValueError(f"Unexpected JSON shape: {list(parsed.keys())}")

    if isinstance(parsed, list):
        return parsed

    raise ValueError("Could not extract question list from response.")


def call_openai(client: OpenAI, model: str, content: str, part_label: str) -> list[dict]:
    print(f"  [{part_label}] Sending {len(content):,} characters to {model}...")

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": content},
        ],
        response_format={"type": "json_object"},
        temperature=0,
        max_tokens=16000,
    )

    raw = response.choices[0].message.content
    usage = response.usage
    print(
        f"  [{part_label}] Tokens used — input: {usage.prompt_tokens:,}, output: {usage.completion_tokens:,}"
    )

    return extract_questions_from_response(json.loads(raw))


def split_on_line_boundary(content: str) -> tuple[str, str]:
    """Split content roughly in half at a line boundary."""
    mid = len(content) // 2
    split_pos = content.rfind("\n", 0, mid)
    if split_pos == -1:
        split_pos = mid
    return content[:split_pos], content[split_pos:]


def parse_md_to_json(md_path: str, model: str) -> list[dict]:
    client = OpenAI()  # reads OPENAI_API_KEY from environment

    with open(md_path, "r", encoding="utf-8") as f:
        content = f.read()

    part1, part2 = split_on_line_boundary(content)
    print(f"  Split into two parts: {len(part1):,} + {len(part2):,} characters")

    questions_part1 = call_openai(client, model, part1, "Part 1")
    questions_part2 = call_openai(client, model, part2, "Part 2")

    combined = questions_part1 + questions_part2
    print(f"  Combined: {len(questions_part1)} + {len(questions_part2)} = {len(combined)} questions")
    return combined


def main():
    parser = argparse.ArgumentParser(
        description="Convert exam MD to structured JSON via GPT."
    )
    parser.add_argument("md_file", help="Path to the markdown file")
    parser.add_argument(
        "--model",
        default="gpt-4o",
        help="OpenAI model to use (default: gpt-4o)",
    )
    args = parser.parse_args()

    md_path = os.path.abspath(args.md_file)
    if not os.path.isfile(md_path):
        print(f"Error: file not found: {md_path}", file=sys.stderr)
        sys.exit(1)

    if not os.environ.get("OPENAI_API_KEY"):
        print("Error: OPENAI_API_KEY environment variable is not set.", file=sys.stderr)
        sys.exit(1)

    out_path = os.path.splitext(md_path)[0] + ".json"

    print(f"Input : {md_path}")
    print(f"Output: {out_path}")
    print(f"Model : {args.model}")

    questions = parse_md_to_json(md_path, args.model)

    print(f"  Parsed {len(questions)} questions.")

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(questions, f, indent=2, ensure_ascii=False)

    print(f"Done. JSON written to: {out_path}")


if __name__ == "__main__":
    main()
