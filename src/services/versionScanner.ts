import * as vscode from 'vscode';
import { VersionMatch, ExtensionConfig, DEFAULT_CONFIG } from '../types';
import { parseVersion } from '../utils/version';

export class VersionScanner {
  private config: ExtensionConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): ExtensionConfig {
    const config = vscode.workspace.getConfiguration('versionUpdater');
    return {
      patterns: config.get<string[]>('patterns') ?? DEFAULT_CONFIG.patterns,
      autoUpdateOnSave: config.get<boolean>('autoUpdateOnSave') ?? DEFAULT_CONFIG.autoUpdateOnSave,
      showCodeLens: config.get<boolean>('showCodeLens') ?? DEFAULT_CONFIG.showCodeLens,
      showDecorations: config.get<boolean>('showDecorations') ?? DEFAULT_CONFIG.showDecorations,
      decorationColor: config.get<string>('decorationColor') ?? DEFAULT_CONFIG.decorationColor,
    };
  }

  public refreshConfig(): void {
    this.config = this.loadConfig();
  }

  public getConfig(): ExtensionConfig {
    return this.config;
  }

  public scanDocument(document: vscode.TextDocument): VersionMatch[] {
    const matches: VersionMatch[] = [];
    const text = document.getText();
    const lines = text.split('\n');

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      if (!line) continue;

      for (const patternString of this.config.patterns) {
        const pattern = new RegExp(patternString, 'gi');
        let match;

        while ((match = pattern.exec(line)) !== null) {
          const versionString = match[1];
          if (!versionString) continue;

          const parsed = parseVersion(versionString);
          if (!parsed) continue;

          const startChar = match.index + match[0].indexOf(versionString);
          const endChar = startChar + versionString.length;

          const versionMatch: VersionMatch = {
            version: versionString,
            major: parsed.major,
            minor: parsed.minor,
            patch: parsed.patch,
            range: new vscode.Range(
              new vscode.Position(lineIndex, startChar),
              new vscode.Position(lineIndex, endChar)
            ),
            line: lineIndex,
            fullMatch: match[0],
          };

          if (parsed.prerelease) {
            versionMatch.prerelease = parsed.prerelease;
          }

          matches.push(versionMatch);
        }
      }
    }

    return this.deduplicateMatches(matches);
  }

  private deduplicateMatches(matches: VersionMatch[]): VersionMatch[] {
    const seen = new Set<string>();
    return matches.filter((match) => {
      const key = `${match.line}:${match.range.start.character}:${match.version}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}
