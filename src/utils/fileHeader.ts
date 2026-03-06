import * as vscode from 'vscode';
import { execFile } from 'child_process';
import * as path from 'path';
import { ExtensionConfig } from '../types';

interface LineCommentStyle {
  kind: 'line';
  prefix: string;
}

interface BlockCommentStyle {
  kind: 'block';
  open: string;
  close: string;
}

type CommentStyle = LineCommentStyle | BlockCommentStyle;

const COMMENT_STYLES: Record<string, CommentStyle> = {
  // Line-style comments with //
  ts: { kind: 'line', prefix: '//' },
  tsx: { kind: 'line', prefix: '//' },
  js: { kind: 'line', prefix: '//' },
  jsx: { kind: 'line', prefix: '//' },
  mjs: { kind: 'line', prefix: '//' },
  cjs: { kind: 'line', prefix: '//' },
  java: { kind: 'line', prefix: '//' },
  kt: { kind: 'line', prefix: '//' },
  kts: { kind: 'line', prefix: '//' },
  scala: { kind: 'line', prefix: '//' },
  swift: { kind: 'line', prefix: '//' },
  go: { kind: 'line', prefix: '//' },
  rs: { kind: 'line', prefix: '//' },
  c: { kind: 'line', prefix: '//' },
  h: { kind: 'line', prefix: '//' },
  cpp: { kind: 'line', prefix: '//' },
  hpp: { kind: 'line', prefix: '//' },
  cs: { kind: 'line', prefix: '//' },
  dart: { kind: 'line', prefix: '//' },
  groovy: { kind: 'line', prefix: '//' },
  php: { kind: 'line', prefix: '//' },
  // Line-style comments with #
  py: { kind: 'line', prefix: '#' },
  rb: { kind: 'line', prefix: '#' },
  sh: { kind: 'line', prefix: '#' },
  bash: { kind: 'line', prefix: '#' },
  zsh: { kind: 'line', prefix: '#' },
  yml: { kind: 'line', prefix: '#' },
  yaml: { kind: 'line', prefix: '#' },
  toml: { kind: 'line', prefix: '#' },
  pl: { kind: 'line', prefix: '#' },
  pm: { kind: 'line', prefix: '#' },
  r: { kind: 'line', prefix: '#' },
  ps1: { kind: 'line', prefix: '#' },
  // Line-style comments with --
  lua: { kind: 'line', prefix: '--' },
  sql: { kind: 'line', prefix: '--' },
  hs: { kind: 'line', prefix: '--' },
  elm: { kind: 'line', prefix: '--' },
  // Line-style comments with ;
  asm: { kind: 'line', prefix: ';' },
  ini: { kind: 'line', prefix: ';' },
  lisp: { kind: 'line', prefix: ';' },
  clj: { kind: 'line', prefix: ';' },
  // Line-style comments with %
  tex: { kind: 'line', prefix: '%' },
  m: { kind: 'line', prefix: '%' },
  erl: { kind: 'line', prefix: '%' },
  // Block-style comments
  html: { kind: 'block', open: '<!--', close: '-->' },
  htm: { kind: 'block', open: '<!--', close: '-->' },
  xml: { kind: 'block', open: '<!--', close: '-->' },
  svg: { kind: 'block', open: '<!--', close: '-->' },
  vue: { kind: 'block', open: '<!--', close: '-->' },
  css: { kind: 'block', open: '/*', close: '*/' },
  scss: { kind: 'block', open: '/*', close: '*/' },
  less: { kind: 'block', open: '/*', close: '*/' },
};

export function getCommentStyle(document: vscode.TextDocument): CommentStyle | undefined {
  const ext = path.extname(document.fileName).replace(/^\./, '').toLowerCase();
  return COMMENT_STYLES[ext];
}

export function formatDate(date: Date = new Date()): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export function buildHeaderLines(
  style: CommentStyle,
  version: string,
  email: string,
  date: string
): string[] {
  if (style.kind === 'line') {
    return [
      `${style.prefix} Version: ${version}`,
      `${style.prefix} Last edited by: ${email}`,
      `${style.prefix} Date: ${date}`,
    ];
  }
  return [
    `${style.open} Version: ${version} ${style.close}`,
    `${style.open} Last edited by: ${email} ${style.close}`,
    `${style.open} Date: ${date} ${style.close}`,
  ];
}

interface HeaderDetection {
  mode: 'insert' | 'replace';
  startLine: number;
  endLine: number; // exclusive, only meaningful for replace
}

const VERSION_HEADER_PATTERN = /Version:\s*\d+\.\d+\.\d+/;
const SHEBANG_PATTERN = /^#!/;
const DOCTYPE_PATTERN = /^<!DOCTYPE/i;

export function detectExistingHeader(document: vscode.TextDocument): HeaderDetection {
  const lineCount = Math.min(document.lineCount, 6);
  let insertLine = 0;

  // Check for shebang or doctype on line 0
  if (lineCount > 0) {
    const firstLine = document.lineAt(0).text;
    if (SHEBANG_PATTERN.test(firstLine) || DOCTYPE_PATTERN.test(firstLine)) {
      insertLine = 1;
    }
  }

  // Look for existing header
  for (let i = insertLine; i < lineCount; i++) {
    const text = document.lineAt(i).text;
    if (VERSION_HEADER_PATTERN.test(text)) {
      // Found existing header — assume it spans 3 lines starting here
      return { mode: 'replace', startLine: i, endLine: Math.min(i + 3, document.lineCount) };
    }
  }

  return { mode: 'insert', startLine: insertLine, endLine: insertLine };
}

let gitEmailCache: string | undefined;

export async function getGitEmail(cwd?: string): Promise<string> {
  if (gitEmailCache !== undefined) {
    return gitEmailCache;
  }

  return new Promise<string>((resolve) => {
    const workingDir = cwd ?? vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();
    try {
      execFile(
        'git',
        ['config', 'user.email'],
        { cwd: workingDir, timeout: 5000 },
        (err, stdout) => {
          const email = err ? 'unknown' : stdout.trim() || 'unknown';
          gitEmailCache = email;
          resolve(email);
        }
      );
    } catch {
      gitEmailCache = 'unknown';
      resolve('unknown');
    }
  });
}

export function clearGitEmailCache(): void {
  gitEmailCache = undefined;
}

export async function resolveEmail(
  config: ExtensionConfig,
  document: vscode.TextDocument
): Promise<string> {
  if (config.fileHeaderEmail) {
    return config.fileHeaderEmail;
  }
  const cwd = path.dirname(document.fileName);
  return getGitEmail(cwd);
}

export async function buildFileHeaderEdits(
  document: vscode.TextDocument,
  newVersion: string,
  config: ExtensionConfig
): Promise<vscode.TextEdit[]> {
  if (!config.fileHeader) {
    return [];
  }

  const style = getCommentStyle(document);
  if (!style) {
    return [];
  }

  const email = await resolveEmail(config, document);
  const date = formatDate();
  const lines = buildHeaderLines(style, newVersion, email, date);
  const detection = detectExistingHeader(document);

  if (detection.mode === 'replace') {
    const range = new vscode.Range(
      new vscode.Position(detection.startLine, 0),
      new vscode.Position(detection.endLine - 1, document.lineAt(detection.endLine - 1).text.length)
    );
    return [vscode.TextEdit.replace(range, lines.join('\n'))];
  }

  // Insert mode
  const headerText = lines.join('\n') + '\n';
  const position = new vscode.Position(detection.startLine, 0);
  return [vscode.TextEdit.insert(position, headerText)];
}
