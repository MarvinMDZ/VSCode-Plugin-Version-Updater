import { describe, it, expect } from 'vitest';
import { parseVersion, bumpVersion, compareVersions, isValidVersion } from '../../utils/version';
import { VersionMatch } from '../../types';
import * as vscode from 'vscode';

// Mock vscode Range and Position
const createMockRange = (): vscode.Range => {
  return {
    start: { line: 0, character: 0 },
    end: { line: 0, character: 5 },
  } as vscode.Range;
};

const createVersionMatch = (version: string): VersionMatch => {
  const parsed = parseVersion(version);
  const match: VersionMatch = {
    version,
    major: parsed?.major ?? 0,
    minor: parsed?.minor ?? 0,
    patch: parsed?.patch ?? 0,
    range: createMockRange(),
    line: 0,
    fullMatch: version,
  };

  if (parsed?.prerelease) {
    match.prerelease = parsed.prerelease;
  }

  return match;
};

describe('parseVersion', () => {
  it('should parse simple version strings', () => {
    const result = parseVersion('1.2.3');
    expect(result).toEqual({
      major: 1,
      minor: 2,
      patch: 3,
    });
  });

  it('should parse version with prerelease', () => {
    const result = parseVersion('1.2.3-beta.1');
    expect(result).toEqual({
      major: 1,
      minor: 2,
      patch: 3,
      prerelease: 'beta.1',
    });
  });

  it('should parse version with alpha prerelease', () => {
    const result = parseVersion('2.0.0-alpha');
    expect(result).toEqual({
      major: 2,
      minor: 0,
      patch: 0,
      prerelease: 'alpha',
    });
  });

  it('should return null for invalid versions', () => {
    expect(parseVersion('invalid')).toBeNull();
    expect(parseVersion('1.2')).toBeNull();
    expect(parseVersion('1.2.3.4')).toBeNull();
    expect(parseVersion('')).toBeNull();
  });

  it('should handle zero versions', () => {
    const result = parseVersion('0.0.0');
    expect(result).toEqual({
      major: 0,
      minor: 0,
      patch: 0,
    });
  });

  it('should handle large version numbers', () => {
    const result = parseVersion('100.200.300');
    expect(result).toEqual({
      major: 100,
      minor: 200,
      patch: 300,
    });
  });
});

describe('bumpVersion', () => {
  it('should bump patch version', () => {
    const match = createVersionMatch('1.2.3');
    expect(bumpVersion(match, 'patch')).toBe('1.2.4');
  });

  it('should bump minor version and reset patch', () => {
    const match = createVersionMatch('1.2.3');
    expect(bumpVersion(match, 'minor')).toBe('1.3.0');
  });

  it('should bump major version and reset minor and patch', () => {
    const match = createVersionMatch('1.2.3');
    expect(bumpVersion(match, 'major')).toBe('2.0.0');
  });

  it('should handle zero versions', () => {
    const match = createVersionMatch('0.0.0');
    expect(bumpVersion(match, 'patch')).toBe('0.0.1');
    expect(bumpVersion(match, 'minor')).toBe('0.1.0');
    expect(bumpVersion(match, 'major')).toBe('1.0.0');
  });

  it('should handle version 9 rollover', () => {
    const match = createVersionMatch('1.2.9');
    expect(bumpVersion(match, 'patch')).toBe('1.2.10');
  });
});

describe('compareVersions', () => {
  it('should return 0 for equal versions', () => {
    expect(compareVersions('1.2.3', '1.2.3')).toBe(0);
  });

  it('should return positive for greater major', () => {
    expect(compareVersions('2.0.0', '1.9.9')).toBeGreaterThan(0);
  });

  it('should return negative for lesser major', () => {
    expect(compareVersions('1.9.9', '2.0.0')).toBeLessThan(0);
  });

  it('should compare minor versions correctly', () => {
    expect(compareVersions('1.3.0', '1.2.9')).toBeGreaterThan(0);
    expect(compareVersions('1.2.9', '1.3.0')).toBeLessThan(0);
  });

  it('should compare patch versions correctly', () => {
    expect(compareVersions('1.2.4', '1.2.3')).toBeGreaterThan(0);
    expect(compareVersions('1.2.3', '1.2.4')).toBeLessThan(0);
  });

  it('should return 0 for invalid versions', () => {
    expect(compareVersions('invalid', '1.2.3')).toBe(0);
    expect(compareVersions('1.2.3', 'invalid')).toBe(0);
  });
});

describe('isValidVersion', () => {
  it('should return true for valid versions', () => {
    expect(isValidVersion('1.2.3')).toBe(true);
    expect(isValidVersion('0.0.0')).toBe(true);
    expect(isValidVersion('10.20.30')).toBe(true);
    expect(isValidVersion('1.2.3-beta')).toBe(true);
  });

  it('should return false for invalid versions', () => {
    expect(isValidVersion('invalid')).toBe(false);
    expect(isValidVersion('1.2')).toBe(false);
    expect(isValidVersion('1.2.3.4')).toBe(false);
    expect(isValidVersion('')).toBe(false);
    expect(isValidVersion('v1.2.3')).toBe(false);
  });
});
