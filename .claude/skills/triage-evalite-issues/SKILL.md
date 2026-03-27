---
name: triage-evalite-issues
description: Triage open GitHub issues for mattpocock/evalite. Fetches the 20 most recent issues, prioritizes bugs, recommends one to focus on, then attempts reproduction and labeling. Use when triaging issues, reviewing the backlog, or deciding what to work on next.
disable-model-invocation: true
---

# Triage Evalite Issues

## Workflow

### 1. Fetch the 20 most recent open issues

Run this command to fetch issues:

```bash
gh issue list --repo mattpocock/evalite --state open --limit 20 --search "-label:Sandcastle -label:enhancement -label:triaged" --json number,title,labels,body,createdAt,comments --jq '.[] | {number, title, labels: [.labels[].name], createdAt, body, comments: [.comments[] | {author: .author.login, body: .body}]}'
```

### 2. Categorize and prioritize

Read each issue and categorize it as one of:

- **Bug** - something that is broken or behaving unexpectedly
- **Feature request** - a new capability or enhancement

Prioritize bugs over feature requests. Within bugs, prioritize by:

1. Issues with clear reproduction steps
2. Issues affecting core functionality (eval execution, scoring, database)
3. Issues affecting integrations (AI SDK, UI)

### 2a. Categorize Features

For each feature request, add an 'enhancement' label:

```bash
gh issue edit <number> --repo mattpocock/evalite --add-label "
enhancement"
```

Confirm with the user first before labelling, in case they have a different categorization in mind.

### 3. Present a summary and recommend one issue

Output a prioritized list:

```
## Bugs (prioritized)
1. #123 - Title - Brief description of the problem
2. #456 - Title - Brief description of the problem

## Feature Requests (for reference)
1. #789 - Title - Brief description
```

Then **recommend the single highest-priority issue** to focus on, with a brief explanation of why it's the top pick. Ask the user to confirm before proceeding. If the user picks a different issue, go with their choice.

### 4. Attempt reproduction for the chosen bug

Try to reproduce the chosen bug using the evalite test suite. Use the **write-a-test** skill for instructions on how to create fixtures and tests.

### 5. If reproduced

Show the user the reproduction results and proposed comment. **Wait for user approval before commenting or labeling.**

1. **Comment on the issue** with detailed reproduction instructions.

   Include code examples and all the details needed for a developer to understand and verify the reproduction.

2. **Add the 'Sandcastle' label**:

   ```bash
   gh issue edit <number> --repo mattpocock/evalite --add-label "Sandcastle"
   ```

3. **Remove the test and fixture** to keep the codebase clean.

### 6. If not reproduced

Report what was tried and why it didn't reproduce. Do not comment on the issue or add labels. Ask the user if they want to pick a different issue from the list.

## Important notes

- Only label issues with 'Sandcastle' if the bug was successfully reproduced
- Do not label feature requests - just list them in the summary
- Do not close or modify issues beyond commenting and labeling
- If the 'Sandcastle' label doesn't exist yet, create it: `gh label create Sandcastle --repo mattpocock/evalite --color "2ea44f" --description "Triaged and ready to work on"`
- Focus on **one issue per session** - depth over breadth
