import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { VersionCodeLensProvider, VersionDecorationProvider } from '../../providers';
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

const createMockDocument = (): vscode.TextDocument => {
  return {
    getText: () => '// @version 1.2.3',
    uri: { toString: () => 'file:///test.ts' },
    version: 1,
  } as unknown as vscode.TextDocument;
};

describe('VersionCodeLensProvider', () => {
  let scanner: VersionScanner;
  let provider: VersionCodeLensProvider;
  const mockToken = { isCancellationRequested: false } as vscode.CancellationToken;

  beforeEach(() => {
    vi.clearAllMocks();
    scanner = new VersionScanner();
    provider = new VersionCodeLensProvider(scanner);
  });

  it('should generate 3 CodeLenses per version match', () => {
    const matches = [createMockMatch('1.2.3', 0, 12)];
    vi.spyOn(scanner, 'scanDocument').mockReturnValue(matches);

    const doc = createMockDocument();
    const lenses = provider.provideCodeLenses(doc, mockToken);

    expect(lenses).toHaveLength(3);
  });

  it('should resolve CodeLenses with correct bump versions', () => {
    const matches = [createMockMatch('1.2.3', 0, 12)];
    vi.spyOn(scanner, 'scanDocument').mockReturnValue(matches);

    const doc = createMockDocument();
    const lenses = provider.provideCodeLenses(doc, mockToken);

    const resolved = lenses.map((l) => provider.resolveCodeLens(l, mockToken));

    expect(resolved[0]?.command?.title).toContain('1.2.4');
    expect(resolved[1]?.command?.title).toContain('1.3.0');
    expect(resolved[2]?.command?.title).toContain('2.0.0');
  });

  it('should generate 6 CodeLenses for 2 matches', () => {
    const matches = [createMockMatch('1.2.3', 0, 12), createMockMatch('2.0.0', 1, 12)];
    vi.spyOn(scanner, 'scanDocument').mockReturnValue(matches);

    const doc = createMockDocument();
    const lenses = provider.provideCodeLenses(doc, mockToken);

    expect(lenses).toHaveLength(6);
  });

  it('should return empty array when showCodeLens is false', () => {
    vi.spyOn(scanner, 'getConfig').mockReturnValue({
      patterns: [],
      autoUpdateOnSave: false,
      showCodeLens: false,
      showDecorations: true,
      decorationColor: 'rgba(100, 200, 100, 0.3)',
      preservePrerelease: false,
      notificationMode: 'default' as const,
      fileHeader: true,
      fileHeaderEmail: '',
    });

    const doc = createMockDocument();
    const lenses = provider.provideCodeLenses(doc, mockToken);

    expect(lenses).toHaveLength(0);
  });

  it('should return empty array when no matches', () => {
    vi.spyOn(scanner, 'scanDocument').mockReturnValue([]);

    const doc = createMockDocument();
    const lenses = provider.provideCodeLenses(doc, mockToken);

    expect(lenses).toHaveLength(0);
  });

  it('should use correct commands for each bump type after resolve', () => {
    const matches = [createMockMatch('1.2.3', 0, 12)];
    vi.spyOn(scanner, 'scanDocument').mockReturnValue(matches);

    const doc = createMockDocument();
    const lenses = provider.provideCodeLenses(doc, mockToken);
    const resolved = lenses.map((l) => provider.resolveCodeLens(l, mockToken));

    expect(resolved[0]?.command?.command).toBe('versionUpdater.bumpPatchAtRange');
    expect(resolved[1]?.command?.command).toBe('versionUpdater.bumpMinorAtRange');
    expect(resolved[2]?.command?.command).toBe('versionUpdater.bumpMajorAtRange');
  });

  it('should have onDidChangeCodeLenses event', () => {
    expect(provider.onDidChangeCodeLenses).toBeDefined();
  });

  it('should fire onDidChangeCodeLenses when refresh is called', () => {
    // Access the internal emitter through the provider
    const fireSpy = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (provider as any)._onDidChangeCodeLenses.fire = fireSpy;

    provider.refresh();
    expect(fireSpy).toHaveBeenCalled();
  });
});

describe('VersionDecorationProvider', () => {
  let scanner: VersionScanner;

  beforeEach(() => {
    vi.clearAllMocks();
    scanner = new VersionScanner();
  });

  it('should create decoration type on construction', () => {
    new VersionDecorationProvider(scanner);
    expect(vscode.window.createTextEditorDecorationType).toHaveBeenCalled();
  });

  it('should apply decorations when showDecorations is true', () => {
    const matches = [createMockMatch('1.2.3', 0, 12)];
    vi.spyOn(scanner, 'scanDocument').mockReturnValue(matches);

    const provider = new VersionDecorationProvider(scanner);
    const mockEditor = {
      document: createMockDocument(),
      setDecorations: vi.fn(),
    } as unknown as vscode.TextEditor;

    provider.updateDecorations(mockEditor);

    expect(mockEditor.setDecorations).toHaveBeenCalled();
    const decorations = vi.mocked(mockEditor.setDecorations).mock.calls[0]?.[1] as
      | vscode.DecorationOptions[]
      | undefined;
    expect(decorations).toHaveLength(1);
  });

  it('should not apply decorations when showDecorations is false', () => {
    vi.spyOn(scanner, 'getConfig').mockReturnValue({
      patterns: [],
      autoUpdateOnSave: false,
      showCodeLens: true,
      showDecorations: false,
      decorationColor: 'rgba(100, 200, 100, 0.3)',
      preservePrerelease: false,
      notificationMode: 'default' as const,
      fileHeader: true,
      fileHeaderEmail: '',
    });

    const provider = new VersionDecorationProvider(scanner);
    const mockEditor = {
      document: createMockDocument(),
      setDecorations: vi.fn(),
    } as unknown as vscode.TextEditor;

    provider.updateDecorations(mockEditor);

    expect(mockEditor.setDecorations).toHaveBeenCalledWith(expect.anything(), []);
  });

  it('should show correct bump values in hover message', () => {
    const matches = [createMockMatch('1.2.3', 0, 12)];
    vi.spyOn(scanner, 'scanDocument').mockReturnValue(matches);

    const provider = new VersionDecorationProvider(scanner);
    const mockEditor = {
      document: createMockDocument(),
      setDecorations: vi.fn(),
    } as unknown as vscode.TextEditor;

    provider.updateDecorations(mockEditor);

    const decorations = vi.mocked(mockEditor.setDecorations).mock.calls[0]?.[1] as
      | vscode.DecorationOptions[]
      | undefined;
    const hoverMessage = decorations?.[0]?.hoverMessage as vscode.MarkdownString | undefined;
    expect(hoverMessage?.value).toContain('1.2.4');
    expect(hoverMessage?.value).toContain('1.3.0');
    expect(hoverMessage?.value).toContain('2.0.0');
  });

  it('should dispose decoration type and listeners', () => {
    const provider = new VersionDecorationProvider(scanner);
    // Should not throw
    provider.dispose();
  });
});
