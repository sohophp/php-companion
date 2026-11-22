import * as vscode from 'vscode';
import {
  BCMATH_NUMBER_DOCUMENT_URI, BUILTIN_DOCUMENT_URI, FILTER_CLASSES_DOCUMENT_URI,
  PDO_DRIVER_DOCUMENT_URI, RANDOM_CLASSES_DOCUMENT_URI, SUPPORTED_PHP_VERSIONS,
  bcmathNumberPhpStub, builtinPhpStub, filterClassesPhpStub, isBuiltinDocumentUri, pdoDriverPhpStub, randomClassesPhpStub,
  parseBcmathNumberDocumentUri, parseBuiltinDocumentUri, parseFilterClassesDocumentUri,
  parsePdoDriverDocumentUri, parseRandomClassesDocumentUri,
  type BuiltinPhpStubOptions, type SupportedPhpVersion,
} from '@php-companion/language-spec';
import type { ParsedPhpDeclarationDocument, PhpSyntaxParser } from '@php-companion/parser';
import catalog from './phpManualCatalog.json';

const SCHEME = 'php-companion-builtin';
const MANUAL = 'https://www.php.net/manual/en/';
const documents = [
  { uri: BUILTIN_DOCUMENT_URI, parse: parseBuiltinDocumentUri, stub: builtinPhpStub },
  { uri: BCMATH_NUMBER_DOCUMENT_URI, parse: parseBcmathNumberDocumentUri, stub: bcmathNumberPhpStub },
  { uri: FILTER_CLASSES_DOCUMENT_URI, parse: parseFilterClassesDocumentUri, stub: filterClassesPhpStub },
  { uri: PDO_DRIVER_DOCUMENT_URI, parse: parsePdoDriverDocumentUri,
    stub: (version: SupportedPhpVersion, options?: BuiltinPhpStubOptions): string =>
      options?.disabledExtensions?.includes('pdo') ? '' : pdoDriverPhpStub(version, options?.pdoRuntime) },
  { uri: RANDOM_CLASSES_DOCUMENT_URI, parse: parseRandomClassesDocumentUri, stub: randomClassesPhpStub },
];

interface BuiltinView {
  text: string;
  mapRange(range: vscode.Range): vscode.Range;
}

type DefinitionResult = vscode.Definition | vscode.LocationLink[] | null | undefined;
type ReferenceResult = vscode.Location[] | null | undefined;

export interface BuiltinDocumentation {
  mapDefinition(result: DefinitionResult): Promise<DefinitionResult>;
  mapReferences(result: ReferenceResult): Promise<ReferenceResult>;
}

function upperBound(sorted: readonly number[], value: number): number {
  let low = 0;
  let high = sorted.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (sorted[middle]! <= value) low = middle + 1;
    else high = middle;
  }
  return low;
}

function lineStarts(text: string): number[] {
  const starts = [0];
  for (let offset = text.indexOf('\n'); offset >= 0; offset = text.indexOf('\n', offset + 1)) {
    starts.push(offset + 1);
  }
  return starts;
}

function memberKey(fqcn: string): string {
  const separator = fqcn.indexOf('::');
  return separator < 0 ? fqcn : fqcn.slice(0, separator).toLowerCase() + fqcn.slice(separator);
}

type ManualEntries = Readonly<Record<string, readonly string[] | undefined>>;

const caseInsensitiveKey = (fqcn: string): string => fqcn.toLowerCase();

function renderBuiltin(source: string, parsed: ParsedPhpDeclarationDocument): BuiltinView {
  const comments = [...parsed.commentRanges].sort((left, right) => left.end - right.end);
  const commentEnds = comments.map((comment) => comment.end);
  const annotations = new Map<number, string[]>();
  const groups = [
    { declarations: parsed.callables, entries: catalog.callables, key: caseInsensitiveKey },
    { declarations: parsed.declarations, entries: catalog.types, key: caseInsensitiveKey },
    { declarations: parsed.constants, entries: catalog.constants, key: memberKey },
    { declarations: parsed.properties.filter((property) => !property.promoted), entries: catalog.properties, key: memberKey },
  ];
  for (const { declarations, entries, key } of groups) {
    const manual: ManualEntries = entries;
    for (const { fqcn, declarationStart } of declarations) {
      const entry = manual[key(fqcn)];
      if (!Array.isArray(entry)) continue;
      const [page, summary] = entry;
      const blocks = annotations.get(declarationStart) ?? [];
      const link = `@see ${MANUAL}${page}`;
      blocks.push(summary ? `${summary.replaceAll('*/', '* /')}\n\n${link}` : link);
      annotations.set(declarationStart, blocks);
    }
  }

  const insertions: Array<{ offset: number; text: string }> = [];
  for (const [start, entries] of annotations) {
    const comment = comments[upperBound(commentEnds, start) - 1];
    const phpDoc = comment && source.startsWith('/**', comment.start) && !source.slice(comment.end, start).trim()
      ? comment : undefined;
    const anchor = phpDoc?.start ?? start;
    const lineStart = source.lastIndexOf('\n', anchor - 1) + 1;
    const before = source.slice(lineStart, anchor);
    const indent = before.match(/^[ \t]*/)?.[0] ?? '';
    const prefix = `\n${indent} *`;
    const body = entries.join('\n\n').split('\n').map((line) => line ? `${prefix} ${line}` : prefix).join('');
    if (phpDoc) {
      const offset = phpDoc.start + 3;
      const ownLine = /^[ \t]*\r?\n/.test(source.slice(offset, phpDoc.end));
      insertions.push({ offset, text: `${body}${prefix}${ownLine ? '' : prefix}` });
    } else {
      insertions.push({ offset: start, text: `${before.trim() ? `\n${indent}` : ''}/**${body}\n${indent} */\n${indent}` });
    }
  }
  if (!insertions.length) return { text: source, mapRange: (range) => range };

  // The server indexes the original source. Each insertion shifts its UTF-16
  // offsets by a known amount before the editor opens the rendered document.
  const offsets: number[] = [];
  const shifts = [0];
  const parts: string[] = [];
  let previous = 0;
  for (const { offset, text } of insertions.sort((left, right) => left.offset - right.offset)) {
    parts.push(source.slice(previous, offset), text);
    previous = offset;
    offsets.push(offset);
    shifts.push(shifts[shifts.length - 1]! + text.length);
  }
  parts.push(source.slice(previous));
  const text = parts.join('');
  const originalLines = lineStarts(source);
  const renderedLines = lineStarts(text);
  const mapPosition = (position: vscode.Position): vscode.Position => {
    const lineStart = originalLines[position.line];
    if (lineStart === undefined) return position;
    const offset = lineStart + position.character;
    const displayOffset = offset + shifts[upperBound(offsets, offset)]!;
    const line = upperBound(renderedLines, displayOffset) - 1;
    return new vscode.Position(line, displayOffset - renderedLines[line]!);
  };
  return { text, mapRange: (range) => new vscode.Range(mapPosition(range.start), mapPosition(range.end)) };
}

export function registerBuiltinDocumentation(
  context: vscode.ExtensionContext,
  parser: () => Promise<PhpSyntaxParser>,
  output: vscode.LogOutputChannel,
): BuiltinDocumentation {
  const views = new Map<string, Promise<BuiltinView>>();
  function view(uri: vscode.Uri): Promise<BuiltinView> {
    const uriText = uri.toString();
    const key = uri.query ? uriText : `${uriText}:${vscode.workspace.getConfiguration('phpCompanion').get<string>('phpVersion', 'auto')}`;
    const cached = views.get(key);
    if (cached) return cached;
    const pending = (async (): Promise<BuiltinView> => {
      const requested = vscode.workspace.getConfiguration('phpCompanion').get<string>('phpVersion', 'auto');
      const version = (SUPPORTED_PHP_VERSIONS as readonly string[]).includes(requested) ? requested as SupportedPhpVersion : '8.5';
      let source = '';
      for (const document of documents) {
        const snapshot = document.parse(uriText);
        if (snapshot || document.uri === uriText) {
          source = document.stub(snapshot?.version ?? version, snapshot);
          break;
        }
      }
      if (source) {
        try {
          const parsed = (await parser()).parseDeclarations(source);
          try { return renderBuiltin(source, parsed); }
          finally { parsed.tree.delete(); }
        } catch (error) {
          output.warn(`Unable to render PHP built-in documentation: ${String(error)}`);
        }
      }
      return { text: source, mapRange: (range) => range };
    })();
    views.set(key, pending);
    if (views.size > 8) views.delete(views.keys().next().value!);
    return pending;
  }

  context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(SCHEME, {
    provideTextDocumentContent: async (uri) => (await view(uri)).text,
  }));
  context.subscriptions.push(vscode.languages.registerDocumentLinkProvider({ scheme: SCHEME }, {
    provideDocumentLinks(document) {
      const pattern = /^[ \t]*\*[ \t]+@see[ \t]+(https:\/\/www\.php\.net\/manual\/en\/[\w.-]+\.php(?:#[\w.-]+)?)(?=\s|$)/gm;
      return Array.from(document.getText().matchAll(pattern), (match) => {
        const url = match[1]!;
        const end = match.index! + match[0].length;
        const range = new vscode.Range(document.positionAt(end - url.length), document.positionAt(end));
        return new vscode.DocumentLink(range, vscode.Uri.parse(url));
      });
    },
  }));

  async function mapLocation(location: vscode.Location): Promise<vscode.Location> {
    if (!isBuiltinDocumentUri(location.uri.toString())) return location;
    return new vscode.Location(location.uri, (await view(location.uri)).mapRange(location.range));
  }
  async function mapLink(link: vscode.LocationLink): Promise<vscode.LocationLink> {
    if (!isBuiltinDocumentUri(link.targetUri.toString())) return link;
    const document = await view(link.targetUri);
    return {
      ...link,
      targetRange: document.mapRange(link.targetRange),
      targetSelectionRange: link.targetSelectionRange && document.mapRange(link.targetSelectionRange),
    };
  }

  return {
    async mapDefinition(result): Promise<DefinitionResult> {
      if (!result) return result;
      if (!Array.isArray(result)) return mapLocation(result);
      if (result.length === 0) return result;
      return 'targetUri' in result[0]! ? Promise.all((result as vscode.LocationLink[]).map(mapLink))
        : Promise.all((result as vscode.Location[]).map(mapLocation));
    },
    async mapReferences(result): Promise<ReferenceResult> {
      return result && Promise.all(result.map(mapLocation));
    },
  };
}
