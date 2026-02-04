# Changelog

All notable changes to the "Version Updater" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-XX-XX

### Added

- **Version Detection**: Automatic scanning of files for semantic version strings
- **CodeLens Integration**: Inline actions above version strings for quick bumping
- **Syntax Highlighting**: Customizable highlighting for detected versions
- **Commands**:
  - `Bump Patch Version` - Increment patch (1.2.3 -> 1.2.4)
  - `Bump Minor Version` - Increment minor (1.2.3 -> 1.3.0)
  - `Bump Major Version` - Increment major (1.2.3 -> 2.0.0)
  - `Bump All Versions` - Batch update all versions in file
  - `Scan Document for Versions` - List all detected versions
  - `Refresh Configuration` - Reload settings
- **Keyboard Shortcuts**:
  - `Ctrl+Alt+P` / `Cmd+Alt+P` - Bump patch
  - `Ctrl+Alt+M` / `Cmd+Alt+M` - Bump minor
  - `Ctrl+Alt+J` / `Cmd+Alt+J` - Bump major
- **Configuration Options**:
  - Custom regex patterns for version detection
  - Toggle CodeLens visibility
  - Toggle decoration highlighting
  - Customizable highlight color
- **Development Infrastructure**:
  - esbuild bundling for fast builds and small package size
  - Comprehensive test suite (unit + integration)
  - GitHub Actions CI/CD pipeline
  - Dependabot for dependency updates
  - ESLint + Prettier for code quality
  - Husky + lint-staged for pre-commit hooks

### Technical Details

- Minimum VS Code version: 1.85.0
- Built with TypeScript 5.9
- Uses esbuild for bundling (~90% smaller package)
