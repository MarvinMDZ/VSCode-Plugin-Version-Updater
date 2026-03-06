import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { VersionScanner } from '../../services';

const createMockDocument = (text: string): vscode.TextDocument => {
  return {
    getText: () => text,
    uri: { toString: () => 'file:///test.ts' },
    version: 1,
  } as unknown as vscode.TextDocument;
};

describe('VersionScanner', () => {
  let scanner: VersionScanner;

  beforeEach(() => {
    scanner = new VersionScanner();
  });

  describe('scanDocument', () => {
    it('should find versions matching default patterns', () => {
      const doc = createMockDocument('// @version 1.2.3\n');
      const matches = scanner.scanDocument(doc);
      expect(matches).toHaveLength(1);
      expect(matches[0]?.version).toBe('1.2.3');
      expect(matches[0]?.major).toBe(1);
      expect(matches[0]?.minor).toBe(2);
      expect(matches[0]?.patch).toBe(3);
    });

    it('should return empty array for document with no versions', () => {
      const doc = createMockDocument('hello world\nno versions here');
      const matches = scanner.scanDocument(doc);
      expect(matches).toHaveLength(0);
    });

    it('should return empty array for empty document', () => {
      const doc = createMockDocument('');
      const matches = scanner.scanDocument(doc);
      expect(matches).toHaveLength(0);
    });

    it('should handle CRLF line endings correctly', () => {
      const doc = createMockDocument('// line 1\r\n// @version 2.0.0\r\n// line 3');
      const matches = scanner.scanDocument(doc);
      expect(matches).toHaveLength(1);
      expect(matches[0]?.version).toBe('2.0.0');
      expect(matches[0]?.line).toBe(1);
    });

    it('should handle LF line endings correctly', () => {
      const doc = createMockDocument('// line 1\n// @version 3.0.0\n// line 3');
      const matches = scanner.scanDocument(doc);
      expect(matches).toHaveLength(1);
      expect(matches[0]?.version).toBe('3.0.0');
      expect(matches[0]?.line).toBe(1);
    });

    it('should find multiple versions on different lines', () => {
      const doc = createMockDocument('// @version 1.0.0\n// @version 2.0.0\n');
      const matches = scanner.scanDocument(doc);
      expect(matches).toHaveLength(2);
      expect(matches[0]?.version).toBe('1.0.0');
      expect(matches[1]?.version).toBe('2.0.0');
    });

    it('should set correct range for version matches', () => {
      const doc = createMockDocument('// @version 1.2.3');
      const matches = scanner.scanDocument(doc);
      expect(matches).toHaveLength(1);
      expect(matches[0]?.range.start.line).toBe(0);
      expect(matches[0]?.range.start.character).toBe(12);
      expect(matches[0]?.range.end.character).toBe(17);
    });

    it('should deduplicate matches at the same position', () => {
      // The default pattern has two patterns that could both match the same version
      const doc = createMockDocument('// @version 1.2.3');
      const matches = scanner.scanDocument(doc);
      // Even if multiple patterns match, deduplication should handle it
      const uniqueKeys = new Set(
        matches.map((m) => `${m.line}:${m.range.start.character}:${m.version}`)
      );
      expect(uniqueKeys.size).toBe(matches.length);
    });

    it('should detect version with prerelease suffix', () => {
      const doc = createMockDocument('// @version 1.2.3-beta.1');
      const matches = scanner.scanDocument(doc);
      expect(matches).toHaveLength(1);
      expect(matches[0]?.version).toBe('1.2.3-beta.1');
      expect(matches[0]?.prerelease).toBe('beta.1');
    });

    it('should store the full match string', () => {
      const doc = createMockDocument('// @version 1.2.3');
      const matches = scanner.scanDocument(doc);
      expect(matches).toHaveLength(1);
      expect(matches[0]?.fullMatch).toContain('1.2.3');
    });
  });

  describe('getConfig', () => {
    it('should return the loaded configuration', () => {
      const config = scanner.getConfig();
      expect(config).toBeDefined();
      expect(config.patterns).toBeDefined();
      expect(Array.isArray(config.patterns)).toBe(true);
      expect(typeof config.showCodeLens).toBe('boolean');
      expect(typeof config.showDecorations).toBe('boolean');
    });
  });

  describe('refreshConfig', () => {
    it('should reload configuration from workspace', () => {
      const getConfigMock = vi.mocked(vscode.workspace.getConfiguration);
      scanner.refreshConfig();
      expect(getConfigMock).toHaveBeenCalledWith('versionUpdater');
    });
  });
});
