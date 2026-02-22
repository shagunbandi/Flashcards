#!/bin/bash

INPUT_DIR="input"
OUTPUT_DIR="output"

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Iterate over all PDF files in input directory
for pdf_file in "$INPUT_DIR"/*.pdf; do
    # Get the base filename without extension
    base_name=$(basename "$pdf_file" .pdf)

    # Run marker_single on the PDF
    if ! marker_single "$pdf_file" --output_dir "$OUTPUT_DIR"; then
        echo "WARNING: marker_single failed for $pdf_file, skipping..."
        continue
    fi

    # Find the corresponding markdown file (assuming .md extension)
    md_file="$OUTPUT_DIR/$base_name.md"
    json_file="$OUTPUT_DIR/$base_name.json"
    flashcard_file="$OUTPUT_DIR/${base_name}_flashcards.json"

    # Convert markdown to json if md file exists
    if [ -f "$md_file" ]; then
        if ! python3 md_to_json.py "$md_file" "$json_file"; then
            echo "WARNING: md_to_json failed for $md_file, skipping..."
            continue
        fi
    fi

    # Convert json to flashcards if json file exists
    if [ -f "$json_file" ]; then
        if ! python3 json_flashcard.py "$json_file" "$flashcard_file"; then
            echo "WARNING: json_flashcard failed for $json_file, skipping..."
        fi
    fi
done
