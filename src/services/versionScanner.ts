import * as vscode from 'vscode';
import { VersionMatch, ExtensionConfig, DEFAULT_CONFIG, NotificationMode } from '../types';
import { parseVersion } from '../utils/version';

interface ScanCache {
  uri: string;
  version: number;
  matches: VersionMatch[];
}

export class VersionScanner {
  private config: ExtensionConfig;
  private compiledPatterns: RegExp[] = [];
  private scanCache: ScanCache | null = null;
  private disposables: vscode.Disposable[] = [];
  private readonly _onDidChangeConfig = new vscode.EventEmitter<void>();
  public readonly onDidChangeConfig: vscode.Event<void> = this._onDidChangeConfig.event;

  constructor() {
    this.config = this.loadConfig();
    this.compilePatterns();

    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('versionUpdater')) {
          this.refreshConfig();
          this._onDidChangeConfig.fire();
        }
      })
    );
  }

  private loadConfig(): ExtensionConfig {
    const config = vscode.workspace.getConfiguration('versionUpdater');
    return {
      patterns: config.get<string[]>('patterns') ?? DEFAULT_CONFIG.patterns,
      autoUpdateOnSave: config.get<boolean>('autoUpdateOnSave') ?? DEFAULT_CONFIG.autoUpdateOnSave,
      showCodeLens: config.get<boolean>('showCodeLens') ?? DEFAULT_CONFIG.showCodeLens,
      showDecorations: config.get<boolean>('showDecorations') ?? DEFAULT_CONFIG.showDecorations,
      decorationColor: config.get<string>('decorationColor') ?? DEFAULT_CONFIG.decorationColor,
      preservePrerelease:
        config.get<boolean>('preservePrerelease') ?? DEFAULT_CONFIG.preservePrerelease,
      notificationMode:
        config.get<NotificationMode>('notificationMode') ?? DEFAULT_CONFIG.notificationMode,
    };
  }

  private compilePatterns(): void {
    this.compiledPatterns = this.config.patterns.map((p) => new RegExp(p, 'gi'));
  }

  public refreshConfig(): void {
    this.config = this.loadConfig();
    this.compilePatterns();
    this.scanCache = null;
  }

  public getConfig(): ExtensionConfig {
    return this.config;
  }

  public scanDocument(document: vscode.TextDocument): VersionMatch[] {
    const uri = document.uri.toString();
    const version = document.version;

    if (this.scanCache?.uri === uri && this.scanCache.version === version) {
      return this.scanCache.matches;
    }

    const matches = this.performScan(document);
    this.scanCache = { uri, version, matches };
    return matches;
  }

  private performScan(document: vscode.TextDocument): VersionMatch[] {
    const matches: VersionMatch[] = [];
    const text = document.getText();
    const lines = text.split(/\r?\n/);

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      if (!line) {
        continue;
      }

      for (const pattern of this.compiledPatterns) {
        pattern.lastIndex = 0;
        let match;

        while ((match = pattern.exec(line)) !== null) {
          const versionString = match[1];
          if (!versionString) {
            continue;
          }

          const parsed = parseVersion(versionString);
          if (!parsed) {
            continue;
          }

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

  public dispose(): void {
    this._onDidChangeConfig.dispose();
    this.disposables.forEach((d) => d.dispose());
  }
}
