import * as vscode from 'vscode';
import { VersionScanner } from '../services/versionScanner';
import { bumpVersion } from '../utils/version';
import { VersionBumpType, VersionMatch } from '../types';

export function createBumpVersionCommand(
  scanner: VersionScanner,
  type: VersionBumpType
): () => Promise<void> {
  return async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('No active editor found');
      return;
    }

    const document = editor.document;
    const selection = editor.selection;
    const matches = scanner.scanDocument(document);

    if (matches.length === 0) {
      vscode.window.showInformationMessage('No version strings found in this file');
      return;
    }

    // Find version at cursor or let user pick
    let targetMatch: VersionMatch | undefined;

    if (!selection.isEmpty || selection.active) {
      targetMatch = matches.find((match) => match.range.contains(selection.active));
    }

    if (!targetMatch) {
      // Show quick pick if multiple versions or no selection
      const items = matches.map((match) => ({
        label: match.version,
        description: `Line ${match.line + 1}`,
        detail: `Will become: ${bumpVersion(match, type)}`,
        match,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: `Select version to bump (${type})`,
        title: 'Version Updater',
      });

      if (!selected) {
        return;
      }
      targetMatch = selected.match;
    }

    const newVersion = bumpVersion(targetMatch, type);

    await editor.edit((editBuilder) => {
      editBuilder.replace(targetMatch.range, newVersion);
    });

    vscode.window.showInformationMessage(`Version updated: ${targetMatch.version} → ${newVersion}`);
  };
}

export function createBumpAllVersionsCommand(
  scanner: VersionScanner,
  type: VersionBumpType
): () => Promise<void> {
  return async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('No active editor found');
      return;
    }

    const document = editor.document;
    const matches = scanner.scanDocument(document);

    if (matches.length === 0) {
      vscode.window.showInformationMessage('No version strings found in this file');
      return;
    }

    const confirm = await vscode.window.showWarningMessage(
      `This will bump ${matches.length} version(s) to ${type}. Continue?`,
      { modal: true },
      'Yes',
      'No'
    );

    if (confirm !== 'Yes') {
      return;
    }

    // Sort by position descending to avoid range shifts
    const sortedMatches = [...matches].sort((a, b) => b.range.start.compareTo(a.range.start));

    await editor.edit((editBuilder) => {
      for (const match of sortedMatches) {
        const newVersion = bumpVersion(match, type);
        editBuilder.replace(match.range, newVersion);
      }
    });

    vscode.window.showInformationMessage(`Updated ${matches.length} version(s) to ${type}`);
  };
}
