import * as vscode from 'vscode';

export type NotificationMode = 'default' | 'silent' | 'statusBar';

let statusBarMessage: vscode.Disposable | undefined;

function getNotificationMode(): NotificationMode {
  const config = vscode.workspace.getConfiguration('versionUpdater');
  return config.get<NotificationMode>('notificationMode') ?? 'default';
}

export function showInfo(message: string): void {
  const mode = getNotificationMode();

  switch (mode) {
    case 'silent':
      break;
    case 'statusBar':
      statusBarMessage?.dispose();
      statusBarMessage = vscode.window.setStatusBarMessage(message, 5000);
      break;
    case 'default':
    default:
      vscode.window.showInformationMessage(message);
      break;
  }
}

export function showWarning(message: string): void {
  // Warnings always show regardless of notification mode
  vscode.window.showWarningMessage(message);
}

export function showError(message: string): void {
  // Errors always show regardless of notification mode
  vscode.window.showErrorMessage(message);
}
