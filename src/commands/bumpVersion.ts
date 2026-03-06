import * as vscode from 'vscode';
import { VersionScanner } from '../services/versionScanner';
import { bumpVersion } from '../utils/version';
import { showInfo } from '../utils/notifications';
import { buildFileHeaderEdits } from '../utils/fileHeader';
import { recordBump } from './undoBump';
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

    if (!selection.isEmpty) {
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
    const headerEdits = await buildFileHeaderEdits(document, newVersion, scanner.getConfig());

    const rangeInHeader = headerEdits.some(
      (edit) =>
        !edit.range.isEmpty &&
        targetMatch.range.start.line >= edit.range.start.line &&
        targetMatch.range.end.line <= edit.range.end.line
    );

    await editor.edit((editBuilder) => {
      if (!rangeInHeader) {
        editBuilder.replace(targetMatch.range, newVersion);
      }
      for (const headerEdit of headerEdits) {
        editBuilder.replace(headerEdit.range, headerEdit.newText);
      }
    });

    recordBump(document.uri, targetMatch.range, targetMatch.version, newVersion);
    showInfo(`Version updated: ${targetMatch.version} → ${newVersion}`);
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

    const firstMatch = matches[0];
    const firstNewVersion = firstMatch ? bumpVersion(firstMatch, type) : undefined;
    const headerEdits = firstNewVersion
      ? await buildFileHeaderEdits(document, firstNewVersion, scanner.getConfig())
      : [];

    await editor.edit((editBuilder) => {
      for (const match of sortedMatches) {
        const matchNewVersion = bumpVersion(match, type);
        const inHeader = headerEdits.some(
          (edit) =>
            !edit.range.isEmpty &&
            match.range.start.line >= edit.range.start.line &&
            match.range.end.line <= edit.range.end.line
        );
        if (!inHeader) {
          editBuilder.replace(match.range, matchNewVersion);
        }
      }
      for (const headerEdit of headerEdits) {
        editBuilder.replace(headerEdit.range, headerEdit.newText);
      }
    });

    showInfo(`Updated ${matches.length} version(s) to ${type}`);
  };
}
