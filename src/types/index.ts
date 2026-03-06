import * as vscode from 'vscode';

export interface VersionMatch {
  version: string;
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  range: vscode.Range;
  line: number;
  fullMatch: string;
}

export type VersionBumpType = 'major' | 'minor' | 'patch';

export type NotificationMode = 'default' | 'silent' | 'statusBar';

export interface ExtensionConfig {
  patterns: string[];
  autoUpdateOnSave: boolean;
  showCodeLens: boolean;
  showDecorations: boolean;
  decorationColor: string;
  preservePrerelease: boolean;
  notificationMode: NotificationMode;
}

export const DEFAULT_CONFIG: ExtensionConfig = {
  patterns: [
    '(?:@version|version:|v|Version)\\s*(\\d+\\.\\d+\\.\\d+(?:-[\\w.]+)?)',
    '(?:^|\\s)v?(\\d+\\.\\d+\\.\\d+(?:-[\\w.]+)?)(?:\\s|$)',
  ],
  autoUpdateOnSave: false,
  showCodeLens: true,
  showDecorations: true,
  decorationColor: 'rgba(100, 200, 100, 0.3)',
  preservePrerelease: false,
  notificationMode: 'default',
};
