import { vi } from 'vitest';

// Mock VSCode module
vi.mock('vscode', () => ({
  Range: class Range {
    constructor(
      public start: { line: number; character: number },
      public end: { line: number; character: number }
    ) {}

    contains(position: { line: number; character: number }): boolean {
      if (position.line < this.start.line || position.line > this.end.line) {
        return false;
      }
      if (position.line === this.start.line && position.character < this.start.character) {
        return false;
      }
      if (position.line === this.end.line && position.character > this.end.character) {
        return false;
      }
      return true;
    }
  },
  Position: class Position {
    constructor(
      public line: number,
      public character: number
    ) {}

    compareTo(other: { line: number; character: number }): number {
      if (this.line !== other.line) {
        return this.line - other.line;
      }
      return this.character - other.character;
    }
  },
  Uri: {
    file: (path: string) => ({
      scheme: 'file',
      fsPath: path,
      toString: () => `file://${path}`,
    }),
  },
  CodeLens: class CodeLens {
    constructor(
      public range: unknown,
      public command?: unknown
    ) {}
  },
  MarkdownString: class MarkdownString {
    constructor(public value: string = '') {}
  },
  TextEdit: {
    replace: vi.fn((range: unknown, newText: string) => ({ range, newText })),
    insert: vi.fn((position: unknown, newText: string) => ({
      range: { start: position, end: position, isEmpty: true },
      newText,
    })),
  },
  StatusBarAlignment: {
    Left: 1,
    Right: 2,
  },
  ProgressLocation: {
    Notification: 15,
  },
  workspace: {
    getConfiguration: vi.fn(() => ({
      get: vi.fn((key: string) => {
        const defaults: Record<string, unknown> = {
          patterns: ['(?:@version|version:|v|Version)\\s*(\\d+\\.\\d+\\.\\d+(?:-[\\w.]+)?)'],
          autoUpdateOnSave: false,
          showCodeLens: true,
          showDecorations: true,
          decorationColor: 'rgba(100, 200, 100, 0.3)',
          preservePrerelease: false,
          notificationMode: 'default',
          fileHeader: true,
          fileHeaderEmail: '',
        };
        return defaults[key];
      }),
    })),
    onDidChangeConfiguration: vi.fn(() => ({ dispose: vi.fn() })),
    onDidChangeTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
    openTextDocument: vi.fn(),
    onWillSaveTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
    findFiles: vi.fn().mockResolvedValue([]),
    asRelativePath: vi.fn((uri: unknown) => String(uri)),
  },
  window: {
    activeTextEditor: undefined,
    showInformationMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    showErrorMessage: vi.fn(),
    showQuickPick: vi.fn(),
    showTextDocument: vi.fn(),
    setStatusBarMessage: vi.fn(() => ({ dispose: vi.fn() })),
    onDidChangeActiveTextEditor: vi.fn(() => ({ dispose: vi.fn() })),
    createTextEditorDecorationType: vi.fn(() => ({
      dispose: vi.fn(),
    })),
    createStatusBarItem: vi.fn(() => ({
      text: '',
      tooltip: '',
      command: '',
      show: vi.fn(),
      hide: vi.fn(),
      dispose: vi.fn(),
    })),
    withProgress: vi.fn(
      (_options: unknown, callback: (progress: unknown, token: unknown) => Promise<void>) =>
        callback({ report: vi.fn() }, { isCancellationRequested: false })
    ),
  },
  commands: {
    registerCommand: vi.fn(),
  },
  languages: {
    registerCodeLensProvider: vi.fn(),
  },
  EventEmitter: class EventEmitter {
    event = vi.fn(() => ({ dispose: vi.fn() }));
    fire = vi.fn();
    dispose = vi.fn();
  },
  OverviewRulerLane: {
    Right: 2,
  },
  TextEditorRevealType: {
    InCenter: 2,
  },
  Selection: class Selection {
    constructor(
      public anchor: { line: number; character: number },
      public active: { line: number; character: number }
    ) {}
  },
}));
