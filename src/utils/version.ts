import { VersionBumpType, VersionMatch } from '../types';

export function parseVersion(versionString: string): {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
} | null {
  const match = versionString.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
  if (!match) {
    return null;
  }

  const [, major, minor, patch, prerelease] = match;
  const result: {
    major: number;
    minor: number;
    patch: number;
    prerelease?: string;
  } = {
    major: parseInt(major ?? '0', 10),
    minor: parseInt(minor ?? '0', 10),
    patch: parseInt(patch ?? '0', 10),
  };

  if (prerelease) {
    result.prerelease = prerelease;
  }

  return result;
}

export function bumpVersion(version: VersionMatch, type: VersionBumpType): string {
  let { major, minor, patch } = version;

  switch (type) {
    case 'major':
      major += 1;
      minor = 0;
      patch = 0;
      break;
    case 'minor':
      minor += 1;
      patch = 0;
      break;
    case 'patch':
      patch += 1;
      break;
  }

  return `${major}.${minor}.${patch}`;
}

export function compareVersions(a: string, b: string): number {
  const parsedA = parseVersion(a);
  const parsedB = parseVersion(b);

  if (!parsedA || !parsedB) {
    return 0;
  }

  if (parsedA.major !== parsedB.major) {
    return parsedA.major - parsedB.major;
  }
  if (parsedA.minor !== parsedB.minor) {
    return parsedA.minor - parsedB.minor;
  }
  return parsedA.patch - parsedB.patch;
}

export function isValidVersion(version: string): boolean {
  return parseVersion(version) !== null;
}
