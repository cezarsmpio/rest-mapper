# Contributing

## Setup

Requires Node.js 22.18+ or 24.11+ for the development toolchain.

```bash
npm ci
npm run verify
```

## Workflow

1. Create a branch from `main`.
2. Make the change with tests.
3. Run `npm run verify`.
4. Commit using [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat: ...` for features
   - `fix: ...` for bug fixes
   - `docs: ...`, `test: ...`, `chore: ...`, `refactor: ...` for other work
5. Open a pull request against `main`.

`npm run verify` runs strict TypeScript checking, the full Vitest suite with 100% coverage thresholds, the dual-format build, and package export validation.

## Releases

Releases are automated with the semantic-release GitHub Action on `main`. Do not edit `CHANGELOG.md`, `package.json` versions, or create tags manually. Commit messages determine the next semantic version.

The action installs semantic-release and its standard plugins in the workflow runtime. They are intentionally not package dependencies, which keeps the library's dependency graph and audit surface small.

## Code style

- Keep modules focused and small.
- Preserve the axios-compatible response shape for every transport.
- Add tests for success, failure, and edge-case branches.
- Do not introduce prototype-polluting merge behavior.
