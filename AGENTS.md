# Repository Guidelines

## Project Structure & Module Organization

This is a dependency-free browser application. `index.html` defines the interface and loads `styles.css` and `src/app.js`. UI state, rendering, translations, and worker coordination belong in `src/app.js`. Keep search and validation logic in `src/solver.js`, tile definitions in `src/tiles.js`, and background execution in `src/solver-worker.js`. Tests live in `test/solver.test.js`.

## Build, Test, and Development Commands

- `npm run dev` starts a static server at `http://localhost:4173` using Python. There is no build step.
- `npm test` runs all tests with Node's built-in test runner.
- `npm run check` performs JavaScript syntax checks on the application modules.

Run both `npm test` and `npm run check` before submitting a change. No package installation is required.

## Coding Style & Naming Conventions

Use modern JavaScript ES modules, two-space indentation, double-quoted strings, semicolons, and trailing commas only where they improve multiline readability. Follow existing naming: `camelCase` for variables and functions, `UPPER_SNAKE_CASE` for shared constants, and descriptive lowercase kebab-case for CSS classes. Prefer small pure functions in solver code and preserve exact `BigInt` fraction arithmetic. Keep English and Thai translation keys synchronized when changing visible UI text. There is no configured formatter or linter, so match nearby code.

## Testing Guidelines

Tests use `node:test` and `node:assert/strict`. Add behavior-focused cases to `test/solver.test.js` with names such as `test("adds 40 points for eight hand tiles", ...)`. Cover valid equations, rejected edge cases, tile scoring, locked-board behavior, and deterministic ranking when relevant. Keep fixtures small and set explicit search limits for potentially expensive cases. The project has no numeric coverage threshold; new logic should still receive targeted regression tests.

## Commit & Pull Request Guidelines

Recent commits use short, imperative, sentence-case subjects, for example `Make solver results deterministic across browsers`. Keep each commit focused and explain non-obvious solver tradeoffs in the body. Pull requests should summarize the change, list verification commands, and describe any rule or scoring impact. Link related issues when available. Include screenshots for UI or responsive-layout changes and note whether both English and Thai views were checked.

## Architecture & Performance Notes

The UI delegates searches to a Web Worker so large racks do not block rendering. Preserve physical tile identity separately from its displayed assignment, and keep results deterministic. If a search optimization changes pruning or limits, verify that incomplete searches remain clearly reported as partial.
