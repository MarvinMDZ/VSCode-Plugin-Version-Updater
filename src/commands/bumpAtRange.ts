import * as vscode from 'vscode';
import { bumpVersion, parseVersion } from '../utils/version';
import { showInfo } from '../utils/notifications';
import { recordBump } from './undoBump';
import { VersionBumpType, VersionMatch } from '../types';

export function createBumpAtRangeCommand(
  type: VersionBumpType
): (uri: vscode.Uri, range: vscode.Range, version: string) => Promise<void> {
  return async (uri: vscode.Uri, range: vscode.Range, version: string) => {
    const activeEditor = vscode.window.activeTextEditor;
    let editor: vscode.TextEditor;

    if (activeEditor && activeEditor.document.uri.toString() === uri.toString()) {
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

    await editor.edit((editBuilder) => {
      editBuilder.replace(range, newVersion);
    });

    recordBump(uri, range, version, newVersion);
    showInfo(`Version updated: ${version} → ${newVersion}`);
  };
}
