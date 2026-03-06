import * as vscode from 'vscode';
import { VersionScanner } from '../services/versionScanner';
import { VersionMatch } from '../types';

interface WorkspaceVersionItem extends vscode.QuickPickItem {
  filePath: string;
  match: VersionMatch;
  uri: vscode.Uri;
}

export function createWorkspaceScanCommand(scanner: VersionScanner): () => Promise<void> {
  return async () => {
    const files = await vscode.workspace.findFiles('**/*', '**/node_modules/**', 500);

    if (files.length === 0) {
      vscode.window.showInformationMessage('No files found in workspace');
      return;
    }

    const items: WorkspaceVersionItem[] = [];

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Scanning workspace for versions...',
        cancellable: true,
      },
      async (progress, token) => {
        for (let i = 0; i < files.length; i++) {
          if (token.isCancellationRequested) {
            break;
          }

          const file = files[i];
          if (!file) {
            continue;
          }

          progress.report({
            increment: 100 / files.length,
            message: `${i + 1}/${files.length}`,
          });

          try {
            const document = await vscode.workspace.openTextDocument(file);
            const matches = scanner.scanDocument(document);

            for (const match of matches) {
              const relativePath = vscode.workspace.asRelativePath(file);
              items.push({
                label: match.version,
                description: relativePath,
                detail: `Line ${match.line + 1}`,
                filePath: relativePath,
                match,
                uri: file,
              });
            }
          } catch {
            // Skip binary or unreadable files
          }
        }
      }
    );

    if (items.length === 0) {
      vscode.window.showInformationMessage('No version strings found in workspace');
      return;
    }

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: `Found ${items.length} version(s) across workspace`,
      title: 'Version Updater - Workspace Scan',
      matchOnDescription: true,
    });

    if (selected) {
      const document = await vscode.workspace.openTextDocument(selected.uri);
      const editor = await vscode.window.showTextDocument(document);
      editor.selection = new vscode.Selection(selected.match.range.start, selected.match.range.end);
      editor.revealRange(selected.match.range, vscode.TextEditorRevealType.InCenter);
    }
  };
}
