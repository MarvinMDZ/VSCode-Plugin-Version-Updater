import * as vscode from 'vscode';
import { VersionScanner } from '../services/versionScanner';
import { bumpVersion } from '../utils/version';

export class VersionDecorationProvider {
  private scanner: VersionScanner;
  private decorationType: vscode.TextEditorDecorationType;
  private disposables: vscode.Disposable[] = [];

  constructor(scanner: VersionScanner) {
    this.scanner = scanner;
    this.decorationType = this.createDecorationType();

    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
          this.updateDecorations(editor);
        }
      }),
      vscode.workspace.onDidChangeTextDocument((event) => {
        const editor = vscode.window.activeTextEditor;
        if (editor && event.document === editor.document) {
          this.updateDecorations(editor);
        }
      }),
      scanner.onDidChangeConfig(() => {
        this.decorationType.dispose();
        this.decorationType = this.createDecorationType();
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          this.updateDecorations(editor);
        }
      })
    );

    // Initial decoration
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      this.updateDecorations(editor);
    }
  }

  private createDecorationType(): vscode.TextEditorDecorationType {
    const config = this.scanner.getConfig();
    return vscode.window.createTextEditorDecorationType({
      backgroundColor: config.decorationColor,
      borderRadius: '3px',
      overviewRulerColor: config.decorationColor,
      overviewRulerLane: vscode.OverviewRulerLane.Right,
    });
  }

  public updateDecorations(editor: vscode.TextEditor): void {
    const config = this.scanner.getConfig();
    if (!config.showDecorations) {
      editor.setDecorations(this.decorationType, []);
      return;
    }

    const matches = this.scanner.scanDocument(editor.document);
    const decorations: vscode.DecorationOptions[] = matches.map((match) => ({
      range: match.range,
      hoverMessage: new vscode.MarkdownString(
        `**Version:** \`${match.version}\`\n\n` +
          `- 🟢 Patch: \`${bumpVersion(match, 'patch')}\`\n` +
          `- 🟡 Minor: \`${bumpVersion(match, 'minor')}\`\n` +
          `- 🔴 Major: \`${bumpVersion(match, 'major')}\``
      ),
    }));

    editor.setDecorations(this.decorationType, decorations);
  }

  public dispose(): void {
    this.decorationType.dispose();
    this.disposables.forEach((d) => d.dispose());
  }
}
