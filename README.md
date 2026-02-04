# Version Updater

[![CI](https://github.com/MarvinMDZ/VSCode-Plugin-Version-Updater/actions/workflows/ci.yml/badge.svg)](https://github.com/MarvinMDZ/VSCode-Plugin-Version-Updater/actions/workflows/ci.yml)
[![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/MarvinMDZ.version-updater-comment)](https://marketplace.visualstudio.com/items?itemName=MarvinMDZ.version-updater-comment)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A VS Code extension to detect and bump semantic version strings in your code comments and files.

## Features

- **Automatic Version Detection**: Scans your files for version strings in comments and code
- **CodeLens Integration**: Shows inline actions above version strings to quickly bump versions
- **Syntax Highlighting**: Highlights detected version strings with customizable colors
- **Multiple Bump Types**: Support for major, minor, and patch version bumps
- **Batch Updates**: Bump all versions in a file at once
- **Customizable Patterns**: Configure regex patterns to match your version string format

### CodeLens Actions

When a version is detected, you'll see inline CodeLens buttons above the version string to quickly bump it:

- `1.2.4` - Bump patch
- `1.3.0` - Bump minor
- `2.0.0` - Bump major

### Version Detection

The extension detects versions in various formats:

```javascript
// @version 1.2.3
// Version: 1.2.3
// v1.2.3
const VERSION = '1.2.3';
```

## Installation

1. Open VS Code
2. Press `Ctrl+P` / `Cmd+P`
3. Type `ext install MarvinMDZ.version-updater-comment`
4. Press Enter

Or search for "Version Updater" in the Extensions view.

## Usage

### Commands

All commands are available in the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

| Command                                       | Description                              |
| --------------------------------------------- | ---------------------------------------- |
| `Version Updater: Bump Patch Version`         | Increment patch version (1.2.3 -> 1.2.4) |
| `Version Updater: Bump Minor Version`         | Increment minor version (1.2.3 -> 1.3.0) |
| `Version Updater: Bump Major Version`         | Increment major version (1.2.3 -> 2.0.0) |
| `Version Updater: Bump All Versions (Patch)`  | Bump all versions in file                |
| `Version Updater: Scan Document for Versions` | Show all detected versions               |
| `Version Updater: Refresh Configuration`      | Reload extension settings                |

### Keyboard Shortcuts

| Shortcut                   | Command    |
| -------------------------- | ---------- |
| `Ctrl+Alt+P` / `Cmd+Alt+P` | Bump Patch |
| `Ctrl+Alt+M` / `Cmd+Alt+M` | Bump Minor |
| `Ctrl+Alt+J` / `Cmd+Alt+J` | Bump Major |

## Extension Settings

Configure the extension in your VS Code settings:

| Setting                           | Type      | Default                    | Description                       |
| --------------------------------- | --------- | -------------------------- | --------------------------------- |
| `versionUpdater.patterns`         | `array`   | See below                  | Regex patterns to detect versions |
| `versionUpdater.showCodeLens`     | `boolean` | `true`                     | Show CodeLens actions             |
| `versionUpdater.showDecorations`  | `boolean` | `true`                     | Highlight version strings         |
| `versionUpdater.decorationColor`  | `string`  | `rgba(100, 200, 100, 0.3)` | Highlight color                   |
| `versionUpdater.autoUpdateOnSave` | `boolean` | `false`                    | Auto-bump patch on save           |

### Default Patterns

```json
[
  "(?:@version|version:|v|Version)\\s*(\\d+\\.\\d+\\.\\d+(?:-[\\w.]+)?)",
  "(?:^|\\s)v?(\\d+\\.\\d+\\.\\d+(?:-[\\w.]+)?)(?:\\s|$)"
]
```

### Custom Pattern Example

To match only JSDoc `@version` tags:

```json
{
  "versionUpdater.patterns": ["@version\\s*(\\d+\\.\\d+\\.\\d+)"]
}
```

## Requirements

- VS Code 1.85.0 or higher

## Known Issues

- Prerelease versions (e.g., `1.2.3-beta.1`) are detected but the prerelease suffix is removed when bumping

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Release Notes

### 1.0.0

- Initial release
- Version detection with customizable patterns
- CodeLens integration for quick version bumps
- Syntax highlighting for detected versions
- Batch version updates
- Keyboard shortcuts
