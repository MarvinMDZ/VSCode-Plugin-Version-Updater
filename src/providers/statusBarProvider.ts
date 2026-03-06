import * as vscode from 'vscode';
import { VersionScanner } from '../services/versionScanner';

export class StatusBarProvider implements vscode.Disposable {
  private statusBarItem: vscode.StatusBarItem;
  private scanner: VersionScanner;
  private disposables: vscode.Disposable[] = [];

  constructor(scanner: VersionScanner) {
    this.scanner = scanner;
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.statusBarItem.command = 'versionUpdater.scanDocument';
    this.statusBarItem.tooltip = 'Click to scan for versions';

    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(() => {
        this.update();
      }),
      vscode.workspace.onDidChangeTextDocument(() => {
        this.update();
      })
    );

    this.update();
  }

  private update(): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      this.statusBarItem.hide();
      return;
    }

    const matches = this.scanner.scanDocument(editor.document);
    if (matches.length === 0) {
      this.statusBarItem.hide();
      return;
    }

    this.statusBarItem.text = `$(versions) ${matches.length} version${matches.length === 1 ? '' : 's'}`;
    this.statusBarItem.show();
  }

  public dispose(): void {
    this.statusBarItem.dispose();
    this.disposables.forEach((d) => d.dispose());
  }
}
