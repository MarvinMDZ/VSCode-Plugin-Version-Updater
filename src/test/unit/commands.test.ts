import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import {
  createBumpVersionCommand,
  createBumpAllVersionsCommand,
  createBumpAtRangeCommand,
} from '../../commands';
import { VersionScanner } from '../../services';
import { VersionMatch } from '../../types';

const createMockMatch = (version: string, line: number, startChar: number): VersionMatch => {
  const parts = version.match(/^(\d+)\.(\d+)\.(\d+)/);
  return {
    version,
    major: parseInt(parts?.[1] ?? '0', 10),
    minor: parseInt(parts?.[2] ?? '0', 10),
    patch: parseInt(parts?.[3] ?? '0', 10),
    range: new vscode.Range(
      new vscode.Position(line, startChar),
      new vscode.Position(line, startChar + version.length)
    ),
    line,
    fullMatch: version,
  };
};

describe('createBumpVersionCommand', () => {
  let scanner: VersionScanner;
  let mockEditor: {
    document: vscode.TextDocument;
    selection: vscode.Selection;
    edit: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    scanner = new VersionScanner();

    mockEditor = {
      document: {
        getText: () => '// @version 1.2.3',
        uri: { toString: () => 'file:///test.ts' },
        fileName: 'test.ts',
        version: 1,
      } as unknown as vscode.TextDocument,
      selection: {
        isEmpty: true,
        active: new vscode.Position(0, 0),
        anchor: new vscode.Position(0, 0),
      } as unknown as vscode.Selection,
      edit: vi.fn().mockResolvedValue(true),
    };

    Object.defineProperty(vscode.window, 'activeTextEditor', {
      get: () => mockEditor,
      configurable: true,
    });
  });

  it('should show warning when no active editor', async () => {
    Object.defineProperty(vscode.window, 'activeTextEditor', {
      get: () => undefined,
      configurable: true,
    });

    const command = createBumpVersionCommand(scanner, 'patch');
    await command();

    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('No active editor found');
  });

  it('should show info message when no versions found', async () => {
    vi.spyOn(scanner, 'scanDocument').mockReturnValue([]);

    const command = createBumpVersionCommand(scanner, 'patch');
    await command();

    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
      'No version strings found in this file'
    );
  });

  it('should show QuickPick when cursor is not on a version', async () => {
    const match = createMockMatch('1.2.3', 0, 12);
    vi.spyOn(scanner, 'scanDocument').mockReturnValue([match]);

    vi.mocked(vscode.window.showQuickPick).mockResolvedValue(undefined);

    const command = createBumpVersionCommand(scanner, 'patch');
    await command();

    expect(vscode.window.showQuickPick).toHaveBeenCalled();
  });

  it('should bump version when user selects from QuickPick', async () => {
    const match = createMockMatch('1.2.3', 0, 12);
    vi.spyOn(scanner, 'scanDocument').mockReturnValue([match]);

    vi.mocked(vscode.window.showQuickPick).mockResolvedValue({
      label: '1.2.3',
      description: 'Line 1',
      detail: 'Will become: 1.2.4',
      match,
    } as unknown as vscode.QuickPickItem);

    const command = createBumpVersionCommand(scanner, 'patch');
    await command();

    expect(mockEditor.edit).toHaveBeenCalled();
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
      'Version updated: 1.2.3 → 1.2.4'
    );
  });

  it('should not bump when user cancels QuickPick', async () => {
    const match = createMockMatch('1.2.3', 0, 12);
    vi.spyOn(scanner, 'scanDocument').mockReturnValue([match]);
    vi.mocked(vscode.window.showQuickPick).mockResolvedValue(undefined);

    const command = createBumpVersionCommand(scanner, 'patch');
    await command();

    expect(mockEditor.edit).not.toHaveBeenCalled();
  });
});

describe('createBumpAllVersionsCommand', () => {
  let scanner: VersionScanner;
  let mockEditor: {
    document: vscode.TextDocument;
    edit: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    scanner = new VersionScanner();

    mockEditor = {
      document: {
        getText: () => '// @version 1.2.3\n// @version 2.0.0',
        uri: { toString: () => 'file:///test.ts' },
        fileName: 'test.ts',
        version: 1,
      } as unknown as vscode.TextDocument,
      edit: vi.fn().mockResolvedValue(true),
    };

    Object.defineProperty(vscode.window, 'activeTextEditor', {
      get: () => mockEditor,
      configurable: true,
    });
  });

  it('should show warning when no active editor', async () => {
    Object.defineProperty(vscode.window, 'activeTextEditor', {
      get: () => undefined,
      configurable: true,
    });

    const command = createBumpAllVersionsCommand(scanner, 'patch');
    await command();

    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('No active editor found');
  });

  it('should show info message when no versions found', async () => {
    vi.spyOn(scanner, 'scanDocument').mockReturnValue([]);

    const command = createBumpAllVersionsCommand(scanner, 'patch');
    await command();

    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
      'No version strings found in this file'
    );
  });

  it('should ask for confirmation before bumping all', async () => {
    const matches = [createMockMatch('1.2.3', 0, 12), createMockMatch('2.0.0', 1, 12)];
    vi.spyOn(scanner, 'scanDocument').mockReturnValue(matches);
    vi.mocked(vscode.window.showWarningMessage).mockResolvedValue(
      'Yes' as unknown as vscode.MessageItem
    );

    const command = createBumpAllVersionsCommand(scanner, 'patch');
    await command();

    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
      expect.stringContaining('2 version(s)'),
      { modal: true },
      'Yes',
      'No'
    );
  });

  it('should not bump when user cancels confirmation', async () => {
    const matches = [createMockMatch('1.2.3', 0, 12)];
    vi.spyOn(scanner, 'scanDocument').mockReturnValue(matches);
    vi.mocked(vscode.window.showWarningMessage).mockResolvedValue(
      'No' as unknown as vscode.MessageItem
    );

    const command = createBumpAllVersionsCommand(scanner, 'patch');
    await command();

    expect(mockEditor.edit).not.toHaveBeenCalled();
  });

  it('should apply edits when user confirms', async () => {
    const matches = [createMockMatch('1.2.3', 0, 12), createMockMatch('2.0.0', 1, 12)];
    vi.spyOn(scanner, 'scanDocument').mockReturnValue(matches);
    vi.mocked(vscode.window.showWarningMessage).mockResolvedValue(
      'Yes' as unknown as vscode.MessageItem
    );

    const command = createBumpAllVersionsCommand(scanner, 'patch');
    await command();

    expect(mockEditor.edit).toHaveBeenCalled();
  });
});

describe('createBumpAtRangeCommand', () => {
  let mockEditor: {
    document: { uri: { toString: () => string }; fileName: string };
    edit: ReturnType<typeof vi.fn>;
  };
  const mockScanner = { getConfig: () => ({ fileHeader: false }) } as unknown as VersionScanner;

  beforeEach(() => {
    vi.clearAllMocks();

    mockEditor = {
      document: { uri: { toString: () => 'file:///test.ts' }, fileName: 'test.ts' },
      edit: vi.fn().mockResolvedValue(true),
    };

    // Set active editor so bumpAtRange uses it directly
    Object.defineProperty(vscode.window, 'activeTextEditor', {
      get: () => mockEditor,
      configurable: true,
    });

    vi.mocked(vscode.window.showTextDocument).mockResolvedValue(
      mockEditor as unknown as vscode.TextEditor
    );
    vi.mocked(vscode.workspace.openTextDocument).mockResolvedValue({} as vscode.TextDocument);
  });

  it('should bump version at the given range', async () => {
    const uri = { toString: () => 'file:///test.ts' } as vscode.Uri;
    const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 5));

    const command = createBumpAtRangeCommand('patch', mockScanner);
    await command(uri, range, '1.2.3');

    expect(mockEditor.edit).toHaveBeenCalled();
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
      'Version updated: 1.2.3 → 1.2.4'
    );
  });

  it('should show error for invalid version', async () => {
    const uri = { toString: () => 'file:///test.ts' } as vscode.Uri;
    const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 5));

    const command = createBumpAtRangeCommand('patch', mockScanner);
    await command(uri, range, 'invalid');

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('Invalid version: invalid');
    expect(mockEditor.edit).not.toHaveBeenCalled();
  });

  it('should bump minor version correctly', async () => {
    const uri = { toString: () => 'file:///test.ts' } as vscode.Uri;
    const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 5));

    const command = createBumpAtRangeCommand('minor', mockScanner);
    await command(uri, range, '1.2.3');

    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
      'Version updated: 1.2.3 → 1.3.0'
    );
  });

  it('should bump major version correctly', async () => {
    const uri = { toString: () => 'file:///test.ts' } as vscode.Uri;
    const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 5));

    const command = createBumpAtRangeCommand('major', mockScanner);
    await command(uri, range, '1.2.3');

    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
      'Version updated: 1.2.3 → 2.0.0'
    );
  });

  it('should use showTextDocument when active editor has different URI', async () => {
    Object.defineProperty(vscode.window, 'activeTextEditor', {
      get: () => ({
        document: { uri: { toString: () => 'file:///other.ts' } },
        edit: vi.fn().mockResolvedValue(true),
      }),
      configurable: true,
    });

    const uri = { toString: () => 'file:///test.ts' } as vscode.Uri;
    const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 5));

    const command = createBumpAtRangeCommand('patch', mockScanner);
    await command(uri, range, '1.2.3');

    expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith(uri);
    expect(vscode.window.showTextDocument).toHaveBeenCalled();
  });
});
