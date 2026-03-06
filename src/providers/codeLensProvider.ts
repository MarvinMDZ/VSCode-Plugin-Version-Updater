import * as vscode from 'vscode';
import { VersionScanner } from '../services/versionScanner';
import { bumpVersion } from '../utils/version';
import { VersionMatch, VersionBumpType } from '../types';

interface VersionCodeLensData {
  uri: vscode.Uri;
  match: VersionMatch;
  type: VersionBumpType;
}

class VersionCodeLens extends vscode.CodeLens {
  constructor(
    range: vscode.Range,
    public readonly data: VersionCodeLensData
  ) {
    super(range);
  }
}

export class VersionCodeLensProvider implements vscode.CodeLensProvider {
  private scanner: VersionScanner;
  private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

  constructor(scanner: VersionScanner) {
    this.scanner = scanner;

    scanner.onDidChangeConfig(() => {
      this._onDidChangeCodeLenses.fire();
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
    const types: VersionBumpType[] = ['patch', 'minor', 'major'];

    for (const match of matches) {
      for (const type of types) {
        codeLenses.push(new VersionCodeLens(match.range, { uri: document.uri, match, type }));
      }
    }

    return codeLenses;
  }

  public resolveCodeLens(
    codeLens: vscode.CodeLens,
    _token: vscode.CancellationToken
  ): vscode.CodeLens {
    if (!(codeLens instanceof VersionCodeLens)) {
      return codeLens;
    }

    const { uri, match, type } = codeLens.data;
    const arrows = type === 'patch' ? '↑' : type === 'minor' ? '↑↑' : '↑↑↑';
    const commandId =
      type === 'patch'
        ? 'versionUpdater.bumpPatchAtRange'
        : type === 'minor'
          ? 'versionUpdater.bumpMinorAtRange'
          : 'versionUpdater.bumpMajorAtRange';

    codeLens.command = {
      title: `${arrows} ${bumpVersion(match, type)}`,
      command: commandId,
      arguments: [uri, match.range, match.version],
      tooltip: `Bump ${type} version`,
    };

    return codeLens;
  }
}
