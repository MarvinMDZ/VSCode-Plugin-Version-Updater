import { vi } from 'vitest';

// Mock VSCode module
vi.mock('vscode', () => ({
  Range: class Range {
    constructor(
      public start: { line: number; character: number },
      public end: { line: number; character: number }
    ) {}
  },
  Position: class Position {
    constructor(
      public line: number,
      public character: number
    ) {}
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
        };
        return defaults[key];
      }),
    })),
    onDidChangeConfiguration: vi.fn(() => ({ dispose: vi.fn() })),
    onDidChangeTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
  },
  window: {
    activeTextEditor: undefined,
    showInformationMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    showErrorMessage: vi.fn(),
    showQuickPick: vi.fn(),
    onDidChangeActiveTextEditor: vi.fn(() => ({ dispose: vi.fn() })),
    createTextEditorDecorationType: vi.fn(() => ({
      dispose: vi.fn(),
    })),
  },
  commands: {
    registerCommand: vi.fn(),
  },
  languages: {
    registerCodeLensProvider: vi.fn(),
  },
  EventEmitter: class EventEmitter {
    event = vi.fn();
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
