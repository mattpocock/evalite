#!/bin/bash

issues=$(gh issue list --state open --label ralph --json number,title,body,comments)
ralph_commits=$(git log --grep="RALPH" -n 10 --format="%H%n%ad%n%B---" --date=short 2>/dev/null || echo "No RALPH commits found")

docker sandbox run claude . -- \
  "$issues Previous RALPH commits: $ralph_commits @ralph/backlog/prompt.md"
