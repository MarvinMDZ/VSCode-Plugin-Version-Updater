# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VS Code extension ("Version Updater") that detects semver version strings in code via configurable regex patterns, highlights them with decorations, provides CodeLens bump buttons (patch/minor/major), and supports batch version bumping. Extension ID: `MarvinMDZ.version-updater-comment`.

## Build & Development Commands

| Command                          | Purpose                                                        |
| -------------------------------- | -------------------------------------------------------------- |
| `npm run compile`                | Type-check (`tsc --noEmit`) + bundle with esbuild              |
| `npm run watch`                  | Dev mode: parallel esbuild watch + tsc watch                   |
| `npm run package`                | Production build (minified, no sourcemaps)                     |
| `npm run lint`                   | ESLint check                                                   |
| `npm run lint:fix`               | ESLint auto-fix                                                |
| `npm run format`                 | Prettier write                                                 |
| `npm run format:check`           | Prettier check                                                 |
| `npm run test:unit`              | Vitest unit tests (no VS Code instance needed)                 |
| `npm run test:unit:watch`        | Vitest watch mode                                              |
| `npm run test:coverage`          | Unit tests with V8 coverage (80% threshold)                    |
| `npm test`                       | Integration tests (requires compiled `out/`, launches VS Code) |
| `vsce package --no-dependencies` | Package as `.vsix`                                             |

## Architecture

**Composition root**: `src/extension.ts` — `activate()` creates a shared `VersionScanner` instance and injects it into providers and command factories. All disposables are pushed onto `context.subscriptions`.

**Core flow**: `VersionScanner.scanDocument()` applies regex patterns to document text, extracts version strings via capture group 1, parses them into `VersionMatch` objects, and deduplicates. Both providers consume these matches.

**Key modules**:

- `src/services/versionScanner.ts` — Stateful scanner, holds config, shared across all consumers
- `src/utils/version.ts` — Pure functions: `parseVersion`, `bumpVersion`, `compareVersions`, `isValidVersion` (no VS Code dependency)
- `src/providers/codeLensProvider.ts` — Produces 3 CodeLenses per version match (patch/minor/major)
- `src/providers/decorationProvider.ts` — Highlights versions with configurable background color, shows hover info
- `src/commands/bumpVersion.ts` — Interactive bump (cursor-based or QuickPick) and batch bump (all versions in file)
- `src/commands/bumpAtRange.ts` — Direct range-based bump triggered by CodeLens clicks

**Barrel exports**: Each folder has an `index.ts` re-exporting its public API. Import from barrel files, not individual modules.

## Key Patterns

- **Factory functions for commands**: `createBumpVersionCommand(scanner, type)` returns a closure — same logic parameterized for patch/minor/major.
- **Reverse-order bulk edits**: `createBumpAllVersionsCommand` sorts matches bottom-to-top before editing to prevent range invalidation.
- **`vscode` is always external**: Never bundled (externalized in esbuild). Unit tests mock the entire module via `src/test/unit/setup.ts`.
- **Two output directories**: `dist/` (esbuild bundle — what VS Code loads) and `out/` (tsc output — only used for integration test runner).
- **Strict TypeScript**: `noUncheckedIndexedAccess` is enabled — array/object indexing returns `T | undefined`, guard accordingly.

## Testing

- **Unit tests** (`src/test/unit/`): Vitest, run with `npm run test:unit`. Mock `vscode` module in `setup.ts`. Fast, no VS Code instance.
- **Integration tests** (`src/test/integration/`): Mocha + `@vscode/test-electron`, run with `npm test`. Require `npm run compile` first (uses `out/` directory). Run inside a real VS Code instance.

## Code Style

- Single quotes, semicolons, 2-space indent, trailing commas (ES5), 100-char print width, LF line endings
- Conventional commits: `feat(scope):`, `fix(scope):`, `refactor:`, `test:`, `chore:`, etc.
- Pre-commit hook (Husky + lint-staged) auto-fixes ESLint and formats staged `.ts` files
- ESLint enforces: `naming-convention`, `explicit-function-return-type` (warn), `no-explicit-any` (warn), `eqeqeq always`, `curly`, `prefer-const`

## Known Limitation

`bumpVersion()` always strips the prerelease suffix — `1.2.3-beta.1` bumped patch becomes `1.2.4`, not `1.2.4-beta.2`.
