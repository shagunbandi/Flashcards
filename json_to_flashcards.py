#!/usr/bin/env python3
"""
Convert GPT-parsed MCQ JSON to the format accepted by the flashcard app's /import endpoint.

Usage:
    python json_to_flashcards.py output/GS-2022/GS-2022.json
    python json_to_flashcards.py output/GS-2022/GS-2022.json --topic "GS 2022 Paper"

Output:
    output/GS-2022/GS-2022_flashcards.json  (same directory as input)

The output can be POST-ed to:
    POST /api/cards/import
    Content-Type: application/json

Or uploaded via:
    POST /api/cards/import-json-file  (multipart, field: file)
"""

import argparse
import json
import os
import sys


def convert(questions: list[dict], topic_name: str) -> dict:
    cards = []
    for q in questions:
        cards.append({
            "question_number": q.get("number"),
            "question": q.get("question", "").strip(),
            "options": q.get("options", {}),
            # No answer key in the source — leave blank for manual fill-in
            "answer": "",
        })
    return {
        "topic_name": topic_name,
        "questions": cards,
    }


def main():
    parser = argparse.ArgumentParser(description="Convert GPT MCQ JSON to flashcard import format.")
    parser.add_argument("json_file", help="Path to the GPT-parsed JSON file")
    parser.add_argument(
        "--topic",
        default=None,
        help="Topic name for the flashcard deck (default: derived from filename, e.g. GS-2022)",
    )
    args = parser.parse_args()

    json_path = os.path.abspath(args.json_file)
    if not os.path.isfile(json_path):
        print(f"Error: file not found: {json_path}", file=sys.stderr)
        sys.exit(1)

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Accept both a raw array and {"questions": [...]}
    if isinstance(data, dict) and "questions" in data:
        questions = data["questions"]
    elif isinstance(data, list):
        questions = data
    else:
        print("Error: JSON must be an array or an object with a 'questions' key.", file=sys.stderr)
        sys.exit(1)

    # Derive topic name from filename if not provided (e.g. "GS-2022.json" → "GS-2022")
    topic_name = args.topic or os.path.splitext(os.path.basename(json_path))[0]

    out_path = os.path.splitext(json_path)[0] + "_flashcards.json"

    result = convert(questions, topic_name)

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    print(f"Converted {len(questions)} questions → {out_path}")
    print(f"Topic name: {result['topic_name']}")
    print()
    print("To import, run:")
    print(f"  curl -X POST http://localhost:3000/api/cards/import \\")
    print(f"       -H 'Content-Type: application/json' \\")
    print(f"       -d @{out_path}")


if __name__ == "__main__":
    main()
