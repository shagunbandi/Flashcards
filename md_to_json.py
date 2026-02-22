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
      "question": "<full question text, including any numbered sub-statements, preserving LaTeX>",
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
- Return ONLY valid JSON — no markdown fences, no extra commentary.
- The top-level value must be a JSON object with a "questions" key containing the array.
"""


def parse_md_to_json(md_path: str, model: str) -> list[dict]:
    client = OpenAI()  # reads OPENAI_API_KEY from environment

    with open(md_path, "r", encoding="utf-8") as f:
        content = f.read()

    print(f"  Sending {len(content):,} characters to {model}...")

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
    print(f"  Tokens used — input: {usage.prompt_tokens:,}, output: {usage.completion_tokens:,}")

    parsed = json.loads(raw)

    # Expected shape: {"questions": [...]}
    # Fallback: try any list value in the object
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

    raise ValueError(f"Could not extract question list from response.")


def main():
    parser = argparse.ArgumentParser(description="Convert exam MD to structured JSON via GPT.")
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
