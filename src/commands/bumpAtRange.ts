import * as vscode from 'vscode';
import { bumpVersion, parseVersion } from '../utils/version';
import { VersionBumpType, VersionMatch } from '../types';

export function createBumpAtRangeCommand(
  type: VersionBumpType
): (uri: vscode.Uri, range: vscode.Range, version: string) => Promise<void> {
  return async (uri: vscode.Uri, range: vscode.Range, version: string) => {
    const document = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(document);

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

    vscode.window.showInformationMessage(`Version updated: ${version} → ${newVersion}`);
  };
}
