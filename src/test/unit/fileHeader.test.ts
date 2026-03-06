import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import {
  getCommentStyle,
  formatDate,
  buildHeaderLines,
  detectExistingHeader,
  buildFileHeaderEdits,
  clearGitEmailCache,
} from '../../utils/fileHeader';
import { ExtensionConfig, DEFAULT_CONFIG } from '../../types';

// Mock child_process
vi.mock('child_process', () => ({
  execFile: vi.fn(
    (
      _cmd: string,
      _args: string[],
      _opts: unknown,
      cb: (err: Error | null, stdout: string) => void
    ) => {
      cb(null, 'test@example.com\n');
    }
  ),
}));

function makeDocument(opts: { fileName: string; lines: string[] }): vscode.TextDocument {
  return {
    fileName: opts.fileName,
    lineCount: opts.lines.length,
    lineAt: (line: number) => ({ text: opts.lines[line] ?? '' }),
    getText: () => opts.lines.join('\n'),
    uri: vscode.Uri.file(opts.fileName),
  } as unknown as vscode.TextDocument;
}

function makeConfig(overrides: Partial<ExtensionConfig> = {}): ExtensionConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}

describe('fileHeader', () => {
  beforeEach(() => {
    clearGitEmailCache();
  });

  describe('getCommentStyle', () => {
    it('returns line style for JS files', () => {
      const doc = makeDocument({ fileName: 'test.js', lines: [''] });
      const style = getCommentStyle(doc);
      expect(style).toEqual({ kind: 'line', prefix: '//' });
    });

    it('returns line style for Python files', () => {
      const doc = makeDocument({ fileName: 'test.py', lines: [''] });
      const style = getCommentStyle(doc);
      expect(style).toEqual({ kind: 'line', prefix: '#' });
    });

    it('returns line style for Lua files', () => {
      const doc = makeDocument({ fileName: 'test.lua', lines: [''] });
      const style = getCommentStyle(doc);
      expect(style).toEqual({ kind: 'line', prefix: '--' });
    });

    it('returns block style for HTML files', () => {
      const doc = makeDocument({ fileName: 'test.html', lines: [''] });
      const style = getCommentStyle(doc);
      expect(style).toEqual({ kind: 'block', open: '<!--', close: '-->' });
    });

    it('returns block style for CSS files', () => {
      const doc = makeDocument({ fileName: 'test.css', lines: [''] });
      const style = getCommentStyle(doc);
      expect(style).toEqual({ kind: 'block', open: '/*', close: '*/' });
    });

    it('returns undefined for unsupported file types', () => {
      const doc = makeDocument({ fileName: 'test.xyz', lines: [''] });
      const style = getCommentStyle(doc);
      expect(style).toBeUndefined();
    });
  });

  describe('formatDate', () => {
    it('returns DD-MM-YYYY format', () => {
      const date = formatDate();
      expect(date).toMatch(/^\d{2}-\d{2}-\d{4}$/);
    });

    it('formats a specific date correctly', () => {
      const date = formatDate(new Date(2026, 2, 6)); // March 6, 2026
      expect(date).toBe('06-03-2026');
    });

    it('pads single-digit day and month', () => {
      const date = formatDate(new Date(2026, 0, 5)); // January 5, 2026
      expect(date).toBe('05-01-2026');
    });
  });

  describe('buildHeaderLines', () => {
    it('builds line-style header', () => {
      const lines = buildHeaderLines(
        { kind: 'line', prefix: '//' },
        '1.2.3',
        'user@test.com',
        '06-03-2026'
      );
      expect(lines).toEqual([
        '// Version: 1.2.3',
        '// Last edited by: user@test.com',
        '// Date: 06-03-2026',
      ]);
    });

    it('builds block-style header for HTML', () => {
      const lines = buildHeaderLines(
        { kind: 'block', open: '<!--', close: '-->' },
        '2.0.0',
        'dev@test.com',
        '01-01-2026'
      );
      expect(lines).toEqual([
        '<!-- Version: 2.0.0 -->',
        '<!-- Last edited by: dev@test.com -->',
        '<!-- Date: 01-01-2026 -->',
      ]);
    });

    it('builds block-style header for CSS', () => {
      const lines = buildHeaderLines(
        { kind: 'block', open: '/*', close: '*/' },
        '3.1.0',
        'css@test.com',
        '15-06-2026'
      );
      expect(lines).toEqual([
        '/* Version: 3.1.0 */',
        '/* Last edited by: css@test.com */',
        '/* Date: 15-06-2026 */',
      ]);
    });
  });

  describe('detectExistingHeader', () => {
    it('returns insert at line 0 for empty file', () => {
      const doc = makeDocument({ fileName: 'test.ts', lines: ['const x = 1;'] });
      const result = detectExistingHeader(doc);
      expect(result).toEqual({ mode: 'insert', startLine: 0, endLine: 0 });
    });

    it('preserves shebang — inserts at line 1', () => {
      const doc = makeDocument({
        fileName: 'test.sh',
        lines: ['#!/bin/bash', 'echo hello'],
      });
      const result = detectExistingHeader(doc);
      expect(result).toEqual({ mode: 'insert', startLine: 1, endLine: 1 });
    });

    it('preserves DOCTYPE — inserts at line 1', () => {
      const doc = makeDocument({
        fileName: 'test.html',
        lines: ['<!DOCTYPE html>', '<html>'],
      });
      const result = detectExistingHeader(doc);
      expect(result).toEqual({ mode: 'insert', startLine: 1, endLine: 1 });
    });

    it('detects existing header for replacement', () => {
      const doc = makeDocument({
        fileName: 'test.ts',
        lines: [
          '// Version: 1.0.0',
          '// Last edited by: user@test.com',
          '// Date: 01-01-2026',
          'const x = 1;',
        ],
      });
      const result = detectExistingHeader(doc);
      expect(result).toEqual({ mode: 'replace', startLine: 0, endLine: 3 });
    });

    it('detects existing header after shebang', () => {
      const doc = makeDocument({
        fileName: 'test.py',
        lines: [
          '#!/usr/bin/env python3',
          '# Version: 1.0.0',
          '# Last edited by: user@test.com',
          '# Date: 01-01-2026',
          'print("hello")',
        ],
      });
      const result = detectExistingHeader(doc);
      expect(result).toEqual({ mode: 'replace', startLine: 1, endLine: 4 });
    });
  });

  describe('buildFileHeaderEdits', () => {
    it('returns empty edits when feature is disabled', async () => {
      const doc = makeDocument({ fileName: 'test.ts', lines: ['const x = 1;'] });
      const config = makeConfig({ fileHeader: false });
      const edits = await buildFileHeaderEdits(doc, '1.0.0', config);
      expect(edits).toEqual([]);
    });

    it('returns empty edits for unsupported file type', async () => {
      const doc = makeDocument({ fileName: 'test.xyz', lines: ['content'] });
      const config = makeConfig();
      const edits = await buildFileHeaderEdits(doc, '1.0.0', config);
      expect(edits).toEqual([]);
    });

    it('returns insert edit for new header', async () => {
      const doc = makeDocument({ fileName: 'test.ts', lines: ['const x = 1;'] });
      const config = makeConfig({ fileHeaderEmail: 'me@test.com' });
      const edits = await buildFileHeaderEdits(doc, '1.2.3', config);
      expect(edits).toHaveLength(1);
      const edit = edits[0]!;
      expect(edit.newText).toContain('// Version: 1.2.3');
      expect(edit.newText).toContain('// Last edited by: me@test.com');
      expect(edit.newText).toContain('// Date:');
      expect(edit.newText.endsWith('\n')).toBe(true);
    });

    it('returns replace edit for existing header', async () => {
      const doc = makeDocument({
        fileName: 'test.ts',
        lines: [
          '// Version: 1.0.0',
          '// Last edited by: old@test.com',
          '// Date: 01-01-2020',
          'const x = 1;',
        ],
      });
      const config = makeConfig({ fileHeaderEmail: 'new@test.com' });
      const edits = await buildFileHeaderEdits(doc, '2.0.0', config);
      expect(edits).toHaveLength(1);
      const edit = edits[0]!;
      expect(edit.newText).toContain('// Version: 2.0.0');
      expect(edit.newText).toContain('// Last edited by: new@test.com');
      expect(edit.newText).not.toContain('1.0.0');
    });

    it('uses setting email over git email', async () => {
      const doc = makeDocument({ fileName: 'test.js', lines: ['const x = 1;'] });
      const config = makeConfig({ fileHeaderEmail: 'setting@test.com' });
      const edits = await buildFileHeaderEdits(doc, '1.0.0', config);
      expect(edits[0]!.newText).toContain('setting@test.com');
    });

    it('falls back to git email when setting is empty', async () => {
      const doc = makeDocument({ fileName: 'test.js', lines: ['const x = 1;'] });
      const config = makeConfig({ fileHeaderEmail: '' });
      const edits = await buildFileHeaderEdits(doc, '1.0.0', config);
      expect(edits[0]!.newText).toContain('test@example.com');
    });
  });
});
