# Out of Scope

Decisions made during triage about what we're NOT going to do, and why.

## #375 - Make export work from `file://` protocol without a server

The exported `index.html` uses absolute paths (`/assets/...`) and ES modules, which don't work when opened directly via `file://`. Making it truly serverless would require inlining all JSON data into the HTML, converting the Vite build to a non-module bundle, and the result would be a single massive file that doesn't scale with large eval datasets.

**Decision:** Fix the docs to remove the "works without server" claim instead. The export already works with any static file server (`npx serve`, GitHub Pages, S3, CI artifact viewers), which covers the real use cases.
