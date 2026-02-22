# Run the flashcard app locally via Docker (postgres + backend + frontend)
run-flashcard:
    docker compose -f flashcard-app/docker-compose.dev.yml up --build

# Run without rebuilding
dev-flashcard:
    docker compose -f flashcard-app/docker-compose.dev.yml up

# Stop and remove flashcard dev containers
stop-flashcard:
    docker compose -f flashcard-app/docker-compose.dev.yml down

# Rebuild production image
rebuild-flashcard:
    docker compose -f flashcard-app/docker-compose.yml build --no-cache flashcard

# Rebuild and restart production container
deploy-flashcard:
    docker compose -f flashcard-app/docker-compose.yml up -d --build flashcard

# Convert all PDFs in input/ to markdown using marker
convert-input:
    #!/usr/bin/env bash
    set -euo pipefail
    shopt -s nullglob
    for f in input/*.pdf; do
        marker_single "$f" --output_dir ./output/
    done

