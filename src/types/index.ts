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

export interface VersionUpdateResult {
  oldVersion: string;
  newVersion: string;
  range: vscode.Range;
}

export type VersionBumpType = 'major' | 'minor' | 'patch';

export interface ExtensionConfig {
  patterns: string[];
  autoUpdateOnSave: boolean;
  showCodeLens: boolean;
  showDecorations: boolean;
  decorationColor: string;
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
};
