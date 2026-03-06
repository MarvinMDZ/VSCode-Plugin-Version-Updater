import * as vscode from 'vscode';
import { showInfo, showWarning } from '../utils/notifications';

interface BumpRecord {
  uri: string;
  range: vscode.Range;
  oldVersion: string;
  newVersion: string;
  timestamp: number;
}

const MAX_HISTORY = 20;
const bumpHistory: BumpRecord[] = [];

export function recordBump(
  uri: vscode.Uri,
  range: vscode.Range,
  oldVersion: string,
  newVersion: string
): void {
  bumpHistory.push({
    uri: uri.toString(),
    range,
    oldVersion,
    newVersion,
    timestamp: Date.now(),
  });

  if (bumpHistory.length > MAX_HISTORY) {
    bumpHistory.shift();
  }
}

export function createUndoBumpCommand(): () => Promise<void> {
  return async () => {
    if (bumpHistory.length === 0) {
      showWarning('No bump history to undo');
      return;
    }

    const record = bumpHistory[bumpHistory.length - 1];
    if (!record) {
      return;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.uri.toString() !== record.uri) {
      showWarning('Undo bump: the file with the last bump is not the active editor');
      return;
    }

    const currentText = editor.document.getText(record.range);
    if (currentText !== record.newVersion) {
      showWarning('Cannot undo: the version has been modified since the bump');
      return;
    }

    const success = await editor.edit((editBuilder) => {
      editBuilder.replace(record.range, record.oldVersion);
    });

    if (success) {
      bumpHistory.pop();
      showInfo(`Undo: ${record.newVersion} → ${record.oldVersion}`);
    }
  };
}
