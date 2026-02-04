import * as vscode from 'vscode';
import { VersionScanner } from '../services/versionScanner';
import { bumpVersion } from '../utils/version';

export class VersionCodeLensProvider implements vscode.CodeLensProvider {
  private scanner: VersionScanner;
  private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

  constructor(scanner: VersionScanner) {
    this.scanner = scanner;

    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('versionUpdater')) {
        this.scanner.refreshConfig();
        this._onDidChangeCodeLenses.fire();
      }
    });
  }

  public refresh(): void {
    this._onDidChangeCodeLenses.fire();
  }

  public provideCodeLenses(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken
  ): vscode.CodeLens[] {
    const config = this.scanner.getConfig();
    if (!config.showCodeLens) {
      return [];
    }

    const matches = this.scanner.scanDocument(document);
    const codeLenses: vscode.CodeLens[] = [];

    for (const match of matches) {
      // Bump patch
      codeLenses.push(
        new vscode.CodeLens(match.range, {
          title: `↑ ${bumpVersion(match, 'patch')}`,
          command: 'versionUpdater.bumpPatchAtRange',
          arguments: [document.uri, match.range, match.version],
          tooltip: 'Bump patch version',
        })
      );

      // Bump minor
      codeLenses.push(
        new vscode.CodeLens(match.range, {
          title: `↑↑ ${bumpVersion(match, 'minor')}`,
          command: 'versionUpdater.bumpMinorAtRange',
          arguments: [document.uri, match.range, match.version],
          tooltip: 'Bump minor version',
        })
      );

      // Bump major
      codeLenses.push(
        new vscode.CodeLens(match.range, {
          title: `↑↑↑ ${bumpVersion(match, 'major')}`,
          command: 'versionUpdater.bumpMajorAtRange',
          arguments: [document.uri, match.range, match.version],
          tooltip: 'Bump major version',
        })
      );
    }

    return codeLenses;
  }
}
