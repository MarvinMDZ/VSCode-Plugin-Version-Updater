import * as vscode from 'vscode';
import { VersionScanner } from './services';
import { VersionCodeLensProvider, VersionDecorationProvider, StatusBarProvider } from './providers';
import {
  createBumpVersionCommand,
  createBumpAllVersionsCommand,
  createBumpAtRangeCommand,
  createWorkspaceScanCommand,
  createUndoBumpCommand,
} from './commands';
import { bumpVersion } from './utils/version';

let decorationProvider: VersionDecorationProvider | undefined;
let scannerInstance: VersionScanner | undefined;

export function activate(context: vscode.ExtensionContext): void {
  const scanner = new VersionScanner();
  scannerInstance = scanner;
  context.subscriptions.push({ dispose: () => scanner.dispose() });

  // Register CodeLens provider
  const codeLensProvider = new VersionCodeLensProvider(scanner);
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider({ scheme: 'file' }, codeLensProvider)
  );

  // Register decoration provider
  decorationProvider = new VersionDecorationProvider(scanner);
  context.subscriptions.push({
    dispose: () => decorationProvider?.dispose(),
  });

  // Register bump commands (interactive)
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'versionUpdater.bumpPatch',
      createBumpVersionCommand(scanner, 'patch')
    ),
    vscode.commands.registerCommand(
      'versionUpdater.bumpMinor',
      createBumpVersionCommand(scanner, 'minor')
    ),
    vscode.commands.registerCommand(
      'versionUpdater.bumpMajor',
      createBumpVersionCommand(scanner, 'major')
    )
  );

  // Register bump all commands
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'versionUpdater.bumpAllPatch',
      createBumpAllVersionsCommand(scanner, 'patch')
    ),
    vscode.commands.registerCommand(
      'versionUpdater.bumpAllMinor',
      createBumpAllVersionsCommand(scanner, 'minor')
    ),
    vscode.commands.registerCommand(
      'versionUpdater.bumpAllMajor',
      createBumpAllVersionsCommand(scanner, 'major')
    )
  );

  // Register bump at range commands (for CodeLens)
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'versionUpdater.bumpPatchAtRange',
      createBumpAtRangeCommand('patch')
    ),
    vscode.commands.registerCommand(
      'versionUpdater.bumpMinorAtRange',
      createBumpAtRangeCommand('minor')
    ),
    vscode.commands.registerCommand(
      'versionUpdater.bumpMajorAtRange',
      createBumpAtRangeCommand('major')
    )
  );

  // Auto-update on save
  context.subscriptions.push(
    vscode.workspace.onWillSaveTextDocument((event) => {
      const config = scanner.getConfig();
      if (!config.autoUpdateOnSave) {
        return;
      }

      const document = event.document;
      const matches = scanner.scanDocument(document);
      if (matches.length === 0) {
        return;
      }

      const sortedMatches = [...matches].sort((a, b) => b.range.start.compareTo(a.range.start));

      event.waitUntil(
        Promise.resolve(
          sortedMatches.map((match) => {
            const newVersion = bumpVersion(match, 'patch');
            return vscode.TextEdit.replace(match.range, newVersion);
          })
        )
      );
    })
  );

  // Status bar
  const statusBarProviderInstance = new StatusBarProvider(scanner);
  context.subscriptions.push(statusBarProviderInstance);

  // Register refresh command
  context.subscriptions.push(
    vscode.commands.registerCommand('versionUpdater.refresh', () => {
      scanner.refreshConfig();
      codeLensProvider.refresh();
      const editor = vscode.window.activeTextEditor;
      if (editor && decorationProvider) {
        decorationProvider.updateDecorations(editor);
      }
      vscode.window.showInformationMessage('Version Updater: Configuration refreshed');
    })
  );

  // Register scan command
  context.subscriptions.push(
    vscode.commands.registerCommand('versionUpdater.scanDocument', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('No active editor found');
        return;
      }

      const matches = scanner.scanDocument(editor.document);
      if (matches.length === 0) {
        vscode.window.showInformationMessage('No version strings found in this file');
        return;
      }

      const items = matches.map((match, index) => ({
        label: match.version,
        description: `Line ${match.line + 1}`,
        detail: `${match.major}.${match.minor}.${match.patch}${match.prerelease ? `-${match.prerelease}` : ''}`,
        index,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: `Found ${matches.length} version(s)`,
        title: 'Version Updater - Scan Results',
      });

      if (selected) {
        const match = matches[selected.index];
        if (match) {
          editor.selection = new vscode.Selection(match.range.start, match.range.end);
          editor.revealRange(match.range, vscode.TextEditorRevealType.InCenter);
        }
      }
    })
  );

  // Register undo bump command
  context.subscriptions.push(
    vscode.commands.registerCommand('versionUpdater.undoBump', createUndoBumpCommand())
  );

  // Register workspace scan command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'versionUpdater.scanWorkspace',
      createWorkspaceScanCommand(scanner)
    )
  );
}

export function deactivate(): void {
  decorationProvider?.dispose();
  scannerInstance?.dispose();
}
