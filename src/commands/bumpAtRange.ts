import * as vscode from 'vscode';
import { bumpVersion, parseVersion } from '../utils/version';
import { showInfo } from '../utils/notifications';
import { buildFileHeaderEdits } from '../utils/fileHeader';
import { recordBump } from './undoBump';
import { VersionBumpType, VersionMatch } from '../types';
import { VersionScanner } from '../services/versionScanner';

export function createBumpAtRangeCommand(
  type: VersionBumpType,
  scanner: VersionScanner
): (uri: vscode.Uri, range: vscode.Range, version: string) => Promise<void> {
  return async (uri: vscode.Uri, range: vscode.Range, version: string) => {
    const activeEditor = vscode.window.activeTextEditor;
    let editor: vscode.TextEditor;

    if (activeEditor?.document.uri.toString() === uri.toString()) {
      editor = activeEditor;
    } else {
      const document = await vscode.workspace.openTextDocument(uri);
      editor = await vscode.window.showTextDocument(document);
    }

    const parsed = parseVersion(version);
    if (!parsed) {
      vscode.window.showErrorMessage(`Invalid version: ${version}`);
      return;
    }

    const match: VersionMatch = {
      version,
      major: parsed.major,
      minor: parsed.minor,
      patch: parsed.patch,
      range,
      line: range.start.line,
      fullMatch: version,
    };

    if (parsed.prerelease) {
      match.prerelease = parsed.prerelease;
    }

    const newVersion = bumpVersion(match, type);
    const headerEdits = await buildFileHeaderEdits(
      editor.document,
      newVersion,
      scanner.getConfig()
    );

    await editor.edit((editBuilder) => {
      editBuilder.replace(range, newVersion);
      for (const headerEdit of headerEdits) {
        if (headerEdit.newText.endsWith('\n') && headerEdit.range.isEmpty) {
          editBuilder.insert(headerEdit.range.start, headerEdit.newText);
        } else {
          editBuilder.replace(headerEdit.range, headerEdit.newText);
        }
      }
    });

    recordBump(uri, range, version, newVersion);
    showInfo(`Version updated: ${version} → ${newVersion}`);
  };
}
