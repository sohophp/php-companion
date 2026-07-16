import type { ParsedDeclaration, ParsedImport, SourceRange } from '../parser/phpParser.js';

export interface IndexedDeclaration extends ParsedDeclaration {
  uri: string;
}

export interface IndexedReference extends SourceRange {
  uri: string;
  fqcn: string;
  text: string;
}

export interface IndexedFile {
  uri: string;
  source: string;
  namespace: string;
  declarations: IndexedDeclaration[];
  imports: ParsedImport[];
  references: IndexedReference[];
  errors: SourceRange[];
  textRanges: SourceRange[];
}

export interface IndexProblem {
  uri?: string;
  message: string;
}
