# Contributing to Version Updater

Thank you for your interest in contributing to Version Updater! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please be respectful and constructive in all interactions. We're all here to build something useful together.

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm 10.x or higher
- VS Code 1.85.0 or higher

### Setting Up the Development Environment

1. **Fork and clone the repository**

   ```bash
   git clone https://github.com/MarvinMDZ/VSCode-Plugin-Version-Updater.git
   cd VSCode-Plugin-Version-Updater
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start the development build**

   ```bash
   npm run watch
   ```

4. **Launch the extension in debug mode**
   - Press `F5` in VS Code
   - A new VS Code window will open with the extension loaded

## Development Workflow

### Project Structure

```
src/
├── commands/       # Command implementations
├── providers/      # CodeLens, decorations, etc.
├── services/       # Business logic
├── types/          # TypeScript interfaces
├── utils/          # Utility functions
├── test/
│   ├── unit/       # Unit tests (Vitest)
│   └── integration/# Integration tests (VS Code test runner)
└── extension.ts    # Extension entry point
```

### Available Scripts

| Script                    | Description                  |
| ------------------------- | ---------------------------- |
| `npm run compile`         | Build the extension          |
| `npm run watch`           | Watch mode for development   |
| `npm run lint`            | Run ESLint                   |
| `npm run lint:fix`        | Fix ESLint issues            |
| `npm run format`          | Format code with Prettier    |
| `npm run test:unit`       | Run unit tests               |
| `npm run test:unit:watch` | Run unit tests in watch mode |
| `npm run test:coverage`   | Run tests with coverage      |
| `npm test`                | Run integration tests        |

### Code Style

- We use **ESLint** and **Prettier** for code formatting
- Run `npm run lint:fix` before committing
- Husky will automatically run lint-staged on pre-commit

### Writing Tests

#### Unit Tests

Unit tests use Vitest and should be placed in `src/test/unit/`:

```typescript
import { describe, it, expect } from 'vitest';
import { parseVersion } from '../../utils/version';

describe('parseVersion', () => {
  it('should parse simple version strings', () => {
    const result = parseVersion('1.2.3');
    expect(result).toEqual({
      major: 1,
      minor: 2,
      patch: 3,
    });
  });
});
```

#### Integration Tests

Integration tests run in a real VS Code instance:

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
  test('Commands should be registered', async () => {
    const commands = await vscode.commands.getCommands();
    assert.ok(commands.includes('versionUpdater.bumpPatch'));
  });
});
```

## Submitting Changes

### Pull Request Process

1. **Create a feature branch**

   ```bash
   git checkout -b feature/my-new-feature
   ```

2. **Make your changes**
   - Write clear, concise commit messages
   - Add tests for new functionality
   - Update documentation if needed

3. **Run quality checks**

   ```bash
   npm run lint
   npm run test:unit
   npm run compile
   ```

4. **Push and create a PR**

   ```bash
   git push origin feature/my-new-feature
   ```

5. **Fill out the PR template**
   - Describe what changes you made
   - Reference any related issues
   - Include screenshots for UI changes

### Commit Message Format

We follow conventional commits:

```
type(scope): description

[optional body]

[optional footer]
```

Types:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

Examples:

```
feat(codelens): add support for prerelease versions
fix(scanner): handle empty files gracefully
docs(readme): update installation instructions
```

## Reporting Bugs

When reporting bugs, please include:

1. VS Code version
2. Extension version
3. Operating system
4. Steps to reproduce
5. Expected behavior
6. Actual behavior
7. Any error messages or logs

## Feature Requests

We welcome feature requests! Please:

1. Check existing issues to avoid duplicates
2. Describe the use case clearly
3. Explain why this feature would be useful to others

## Questions?

Feel free to open a discussion or issue if you have questions. We're happy to help!
