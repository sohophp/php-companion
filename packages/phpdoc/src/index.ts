export interface SourceRange { start: number; end: number; }

export type PhpDocType =
  | ({ kind: 'name'; name: string } & SourceRange)
  | ({ kind: 'literal'; value: number; raw: string } & SourceRange)
  | ({ kind: 'negated'; type: PhpDocType } & SourceRange)
  | ({ kind: 'nullable'; type: PhpDocType } & SourceRange)
  | ({ kind: 'conditional'; subject: PhpDocType; target: PhpDocType; negated: boolean; ifTrue: PhpDocType; ifFalse: PhpDocType } & SourceRange)
  | ({ kind: 'union' | 'intersection'; types: PhpDocType[] } & SourceRange)
  | ({ kind: 'generic'; base: PhpDocType; arguments: PhpDocType[] } & SourceRange)
  | ({ kind: 'callable'; callableName: string; parameters: PhpDocCallableParameter[]; returnType?: PhpDocType } & SourceRange)
  | ({ kind: 'array'; element: PhpDocType } & SourceRange)
  | ({ kind: 'shape'; shapeKind: 'array' | 'object'; fields: PhpDocShapeField[] } & SourceRange);

export interface PhpDocShapeField extends SourceRange { key?: string; optional: boolean; type: PhpDocType; }
export interface PhpDocCallableParameter extends SourceRange { type: PhpDocType; name?: string; optional: boolean; variadic: boolean; }
export interface PhpDocMethodTemplate extends SourceRange { name: string; bound?: PhpDocType; defaultType?: PhpDocType; }
export type PhpDocTagName = 'param' | 'return' | 'var' | 'throws' | 'template' | 'extends' | 'implements' | 'assert' | 'assert-if-true' | 'assert-if-false' | 'property' | 'property-read' | 'property-write' | 'method';
export type PhpDocDialect = 'phpdoc' | 'phpstan' | 'psalm';
export type PhpDocTemplateVariance = 'covariant' | 'contravariant' | 'invariant';
export interface PhpDocTag extends SourceRange { name: PhpDocTagName; dialect: PhpDocDialect; type?: PhpDocType; variable?: string; propertyPath?: string[]; description: string; variance?: PhpDocTemplateVariance; parameters?: PhpDocCallableParameter[]; templates?: PhpDocMethodTemplate[]; static?: boolean; }
export interface PhpDocError extends SourceRange { message: string; }
export interface ParsedPhpDoc { tags: PhpDocTag[]; errors: PhpDocError[]; }

const TAGS = new Set<PhpDocTagName>(['param', 'return', 'var', 'throws', 'template', 'extends', 'implements', 'assert', 'assert-if-true', 'assert-if-false', 'property', 'property-read', 'property-write', 'method']);

class TypeParser {
  position = 0;
  readonly errors: PhpDocError[] = [];
  constructor(private readonly text: string, private readonly base: number) {}
  private skip(): void { while (/\s/.test(this.text[this.position] ?? '')) this.position += 1; }
  private error(message: string): void { this.errors.push({ start: this.base + this.position, end: this.base + Math.min(this.position + 1, this.text.length), message }); }
  parse(): PhpDocType | undefined { this.skip(); return this.conditional(); }
  private conditional(): PhpDocType | undefined {
    const subject = this.union(); if (!subject) return undefined;
    this.skip(); const operator = /^(is\s+not|is)\b/i.exec(this.text.slice(this.position));
    if (!operator) return subject;
    this.position += operator[0].length;
    const target = this.union();
    if (!target) { this.error('Expected a conditional target type after is.'); return subject; }
    this.skip();
    if (this.text[this.position] !== '?') { this.error('Expected ? in a conditional type.'); return subject; }
    this.position += 1; const ifTrue = this.conditional();
    if (!ifTrue) { this.error('Expected the true branch of a conditional type.'); return subject; }
    this.skip();
    if (this.text[this.position] !== ':') { this.error('Expected : in a conditional type.'); return subject; }
    this.position += 1; const ifFalse = this.conditional();
    if (!ifFalse) { this.error('Expected the false branch of a conditional type.'); return subject; }
    return { kind: 'conditional', subject, target, negated: /not/i.test(operator[0]), ifTrue, ifFalse,
      start: subject.start, end: ifFalse.end };
  }
  private union(): PhpDocType | undefined {
    const first = this.intersection(); if (!first) return undefined;
    const types = [first]; this.skip();
    while (this.text[this.position] === '|') { this.position += 1; const next = this.intersection(); if (!next) { this.error('Expected a type after |.'); break; } types.push(next); this.skip(); }
    return types.length === 1 ? first : { kind: 'union', types, start: first.start, end: types.at(-1)!.end };
  }
  private intersection(): PhpDocType | undefined {
    const first = this.postfix(); if (!first) return undefined;
    const types = [first]; this.skip();
    while (this.text[this.position] === '&') { this.position += 1; const next = this.postfix(); if (!next) { this.error('Expected a type after &.'); break; } types.push(next); this.skip(); }
    return types.length === 1 ? first : { kind: 'intersection', types, start: first.start, end: types.at(-1)!.end };
  }
  private postfix(): PhpDocType | undefined {
    let value = this.primary(); if (!value) return undefined; this.skip();
    while (this.text.slice(this.position, this.position + 2) === '[]') { this.position += 2; value = { kind: 'array', element: value, start: value.start, end: this.base + this.position }; this.skip(); }
    return value;
  }
  private primary(): PhpDocType | undefined {
    this.skip(); const start = this.position;
    if (this.text[this.position] === '!') {
      this.position += 1; const type = this.primary();
      if (!type) { this.error('Expected a type after !.'); return undefined; }
      return { kind: 'negated', type, start: this.base + start, end: type.end };
    }
    if (this.text[this.position] === '?') { this.position += 1; const type = this.primary(); if (!type) { this.error('Expected a type after ?.'); return undefined; } return { kind: 'nullable', type, start: this.base + start, end: type.end }; }
    if (this.text[this.position] === '(') { this.position += 1; const type = this.conditional(); this.skip(); if (this.text[this.position] !== ')') this.error('Expected ).'); else this.position += 1; return type && { ...type, start: this.base + start, end: this.base + this.position }; }
    const integerMatch = /^-?(?:0|[1-9](?:_?[0-9])*)(?![A-Za-z0-9_\x80-\xff])/.exec(this.text.slice(this.position));
    if (integerMatch) {
      this.position += integerMatch[0].length;
      return { kind: 'literal', value: Number(integerMatch[0].replaceAll('_', '')), raw: integerMatch[0],
        start: this.base + start, end: this.base + this.position };
    }
    const nameMatch = /^(?:\\?[A-Za-z_\x80-\xff][A-Za-z0-9_\\\x80-\xff-]*(?:::(?:[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*|\*))?|\$[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*|true|false|null|\*)/.exec(this.text.slice(this.position));
    if (!nameMatch) return undefined;
    this.position += nameMatch[0].length;
    const baseType: PhpDocType = { kind: 'name', name: nameMatch[0], start: this.base + start, end: this.base + this.position };
    this.skip();
    if ((['callable', 'closure'].includes(nameMatch[0].toLowerCase()) || nameMatch[0].toLowerCase().endsWith('\\closure')) && this.text[this.position] === '(') return this.callable(start, nameMatch[0]);
    if ((nameMatch[0] === 'array' || nameMatch[0] === 'object') && this.text[this.position] === '{') return this.shape(nameMatch[0], start);
    if (this.text[this.position] !== '<') return baseType;
    this.position += 1; const args: PhpDocType[] = [];
    let expectsArgument = true;
    while (expectsArgument) {
      const arg = this.union();
      if (!arg) { this.error('Expected a generic type argument.'); break; }
      args.push(arg); this.skip(); expectsArgument = this.text[this.position] === ',';
      if (expectsArgument) this.position += 1;
    }
    this.skip(); if (this.text[this.position] !== '>') this.error('Expected >.'); else this.position += 1;
    return { kind: 'generic', base: baseType, arguments: args, start: this.base + start, end: this.base + this.position };
  }
  private callable(start: number, callableName: string): PhpDocType {
    this.position += 1; const parameters: PhpDocCallableParameter[] = []; this.skip();
    while (this.position < this.text.length && this.text[this.position] !== ')') {
      const parameterStart = this.position; let variadic = false;
      if (this.text.slice(this.position, this.position + 3) === '...') { variadic = true; this.position += 3; this.skip(); }
      const type = this.union();
      if (!type) { this.error('Expected a callable parameter type.'); break; }
      this.skip();
      if (this.text.slice(this.position, this.position + 3) === '...') { variadic = true; this.position += 3; this.skip(); }
      const nameMatch = /^\$([A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*)/.exec(this.text.slice(this.position));
      const name = nameMatch?.[1]; if (nameMatch) { this.position += nameMatch[0].length; this.skip(); }
      const optional = this.text[this.position] === '=';
      if (optional) this.position += 1;
      parameters.push({ type, name, optional, variadic, start: this.base + parameterStart, end: this.base + this.position });
      this.skip(); if (this.text[this.position] !== ',') break; this.position += 1; this.skip();
      if (this.text[this.position] === ')') this.error('Expected a callable parameter type.');
    }
    if (this.text[this.position] !== ')') this.error('Expected ) after callable parameters.'); else this.position += 1;
    this.skip(); let returnType: PhpDocType | undefined;
    if (this.text[this.position] === ':') {
      this.position += 1; returnType = this.conditional();
      if (!returnType) this.error('Expected a callable return type.');
    }
    return { kind: 'callable', callableName, parameters, returnType, start: this.base + start, end: returnType?.end ?? this.base + this.position };
  }
  private shape(shapeKind: 'array' | 'object', start: number): PhpDocType {
    this.position += 1; const fields: PhpDocShapeField[] = []; this.skip();
    while (this.position < this.text.length && this.text[this.position] !== '}') {
      const fieldStart = this.position;
      const keyMatch = /^(?:[A-Za-z_][A-Za-z0-9_-]*|-?\d+|'[^']*'|"[^"]*")/.exec(this.text.slice(this.position));
      let key: string | undefined; let optional = false;
      if (keyMatch) { const afterKey = this.position + keyMatch[0].length; let probe = afterKey; while (/\s/.test(this.text[probe] ?? '')) probe += 1; if (this.text[probe] === '?') { optional = true; probe += 1; } if (this.text[probe] === ':') { key = keyMatch[0]; this.position = probe + 1; } }
      const type = this.union();
      if (!type) { this.error('Expected an array shape field type.'); break; }
      fields.push({ key, optional, type, start: this.base + fieldStart, end: type.end });
      this.skip(); if (this.text[this.position] !== ',') break; this.position += 1; this.skip();
    }
    if (this.text[this.position] !== '}') this.error('Expected }.'); else this.position += 1;
    return { kind: 'shape', shapeKind, fields, start: this.base + start, end: this.base + this.position };
  }
}

export function parsePhpDocType(text: string, baseOffset = 0): { type?: PhpDocType; consumed: number; errors: PhpDocError[] } {
  const parser = new TypeParser(text, baseOffset); const type = parser.parse();
  return { type, consumed: parser.position, errors: parser.errors };
}

export function parsePhpDoc(source: string, baseOffset = 0): ParsedPhpDoc {
  const tags: PhpDocTag[] = []; const errors: PhpDocError[] = [];
  const pattern = /@(?:(phpstan|psalm)-)?(param|return|var|throws|property(?:-(?:read|write))?|method|assert(?:-if-(?:true|false))?|(?:template-)?extends|(?:template-)?implements|template(?:-covariant|-contravariant)?)\b([^\r\n]*)/g;
  for (const match of source.matchAll(pattern)) {
    const dialect = (match[1]?.toLowerCase() ?? 'phpdoc') as PhpDocDialect;
    const rawName = match[2]!.toLowerCase();
    const name = rawName.replace(/^template-(?=extends|implements$)/, '').replace(/-(?:co|contra)variant$/, '') as PhpDocTagName;
    const variance: PhpDocTemplateVariance | undefined = name === 'template'
      ? rawName.endsWith('-covariant') ? 'covariant' : rawName.endsWith('-contravariant') ? 'contravariant' : 'invariant'
      : undefined;
    if (!TAGS.has(name)) continue;
    const body = match[3] ?? ''; const leading = body.length - body.trimStart().length;
    const bodyStart = baseOffset + match.index + match[0].indexOf(body) + leading;
    const clean = body.trimStart().replace(/\s*\*\/\s*$/, '');
    if (name === 'property' || name === 'property-read' || name === 'property-write') {
      const parsed = parsePhpDocType(clean, bodyStart); errors.push(...parsed.errors);
      let rest = clean.slice(parsed.consumed).trimStart();
      const property = /^(\$[A-Za-z_][A-Za-z0-9_]*)/.exec(rest);
      if (!parsed.type || !property) errors.push({ start: bodyStart, end: bodyStart + clean.length, message: 'Expected a type and property name for @property.' });
      if (property) rest = rest.slice(property[0].length).trimStart();
      tags.push({ name, dialect, type: parsed.type, variable: property?.[1], description: rest,
        start: baseOffset + match.index, end: bodyStart + clean.length });
      continue;
    }
    if (name === 'method') {
      const isStatic = /^static\s+/i.test(clean); const methodBody = clean.replace(/^static\s+/i, '');
      const methodBodyStart = bodyStart + (clean.length - methodBody.length);
      const parsed = parsePhpDocType(methodBody, methodBodyStart); errors.push(...parsed.errors);
      let cursor = parsed.consumed; while (/\s/.test(methodBody[cursor] ?? '')) cursor += 1;
      const methodName = /^([A-Za-z_][A-Za-z0-9_]*)/.exec(methodBody.slice(cursor));
      if (methodName) cursor += methodName[0].length;
      const templates: PhpDocMethodTemplate[] = [];
      if (methodBody[cursor] === '<') {
        const templateStart = cursor + 1; let depth = 1; cursor += 1;
        while (cursor < methodBody.length && depth > 0) {
          if (methodBody[cursor] === '<') depth += 1;
          else if (methodBody[cursor] === '>') depth -= 1;
          cursor += 1;
        }
        if (depth > 0) errors.push({ start: methodBodyStart + templateStart - 1, end: methodBodyStart + methodBody.length, message: 'Expected > after @method templates.' });
        else {
          const templateText = methodBody.slice(templateStart, cursor - 1); const parts: Array<{ text: string; start: number }> = [];
          let partStart = 0; let nested = 0;
          for (let index = 0; index <= templateText.length; index += 1) {
            const character = templateText[index];
            if (character === '<' || character === '(' || character === '{' || character === '[') nested += 1;
            else if (character === '>' || character === ')' || character === '}' || character === ']') nested = Math.max(0, nested - 1);
            if ((character === ',' && nested === 0) || index === templateText.length) { parts.push({ text: templateText.slice(partStart, index), start: partStart }); partStart = index + 1; }
          }
          for (const part of parts) {
            const declaration = /^\s*([A-Za-z_][A-Za-z0-9_]*)(?:\s+(?:of|as)\s+(.+?))?(?:\s*=\s*(.+))?\s*$/.exec(part.text);
            if (!declaration) { errors.push({ start: methodBodyStart + templateStart + part.start, end: methodBodyStart + templateStart + part.start + part.text.length, message: 'Expected an @method template declaration.' }); continue; }
            const boundText = declaration[2]; const defaultText = declaration[3];
            const bound = boundText ? parsePhpDocType(boundText, methodBodyStart + templateStart + part.start + part.text.indexOf(boundText)) : undefined;
            const defaultType = defaultText ? parsePhpDocType(defaultText, methodBodyStart + templateStart + part.start + part.text.lastIndexOf(defaultText)) : undefined;
            if (bound) errors.push(...bound.errors); if (defaultType) errors.push(...defaultType.errors);
            templates.push({ name: declaration[1]!, bound: bound?.type, defaultType: defaultType?.type,
              start: methodBodyStart + templateStart + part.start, end: methodBodyStart + templateStart + part.start + part.text.length });
          }
        }
      }
      while (/\s/.test(methodBody[cursor] ?? '')) cursor += 1;
      const parametersStart = methodBody[cursor] === '(' ? cursor + 1 : -1; let close = -1;
      if (parametersStart >= 0) {
        let depth = 1; let quote = ''; let escaped = false;
        for (let index = parametersStart; index < methodBody.length; index += 1) {
          const character = methodBody[index]!;
          if (escaped) { escaped = false; continue; }
          if (quote) { if (character === '\\') escaped = true; else if (character === quote) quote = ''; continue; }
          if (character === "'" || character === '"') { quote = character; continue; }
          if (character === '(') depth += 1;
          else if (character === ')' && --depth === 0) { close = index; break; }
        }
      }
      const parameterText = parametersStart >= 0 && close >= 0 ? methodBody.slice(parametersStart, close) : undefined;
      const callable = parameterText === undefined ? undefined : parsePhpDocType(`callable(${parameterText}): mixed`).type;
      if (!parsed.type || !methodName || callable?.kind !== 'callable') errors.push({ start: bodyStart, end: bodyStart + clean.length, message: 'Expected a return type and callable signature for @method.' });
      tags.push({ name, dialect, type: parsed.type, variable: methodName?.[1], parameters: callable?.kind === 'callable' ? callable.parameters : undefined,
        templates, static: isStatic, description: close >= 0 ? methodBody.slice(close + 1).trimStart() : '', start: baseOffset + match.index, end: bodyStart + clean.length });
      continue;
    }
    if (name === 'template') {
      const template = /^([A-Za-z_][A-Za-z0-9_]*)(?:\s+(?:of|as)\s+(.+?))?(?:\s+(.+))?$/.exec(clean);
      const typeText = template?.[2]; const parsed = typeText ? parsePhpDocType(typeText, bodyStart + clean.indexOf(typeText)) : undefined;
      if (parsed) errors.push(...parsed.errors);
      tags.push({ name, dialect, type: parsed?.type, variable: template?.[1], description: template?.[3] ?? '', variance, start: baseOffset + match.index, end: bodyStart + clean.length });
      continue;
    }
    const assertion = name === 'assert' || name === 'assert-if-true' || name === 'assert-if-false';
    const typeSource = (name === 'param' || name === 'var' || assertion)
      ? clean.replace(/&(?=\s*(?:\.\.\.\s*)?\$[A-Za-z_][A-Za-z0-9_]*)/g, ' ')
      : clean;
    const parsed = parsePhpDocType(typeSource, bodyStart); errors.push(...parsed.errors);
    let rest = clean.slice(parsed.consumed).trimStart(); let variable: string | undefined; let propertyPath: string[] | undefined;
    const variableMatch = (name === 'param' || name === 'var' || assertion)
      ? (assertion
          ? /^(?:&\s*)?(?:\.\.\.\s*)?(\$[A-Za-z_][A-Za-z0-9_]*)((?:\s*->\s*[A-Za-z_][A-Za-z0-9_]*)*)/.exec(rest)
          : /^(?:&\s*)?(?:\.\.\.\s*)?(\$[A-Za-z_][A-Za-z0-9_]*)/.exec(rest))
      : undefined;
    if (variableMatch) {
      variable = variableMatch[1];
      propertyPath = assertion ? [...(variableMatch[2] ?? '').matchAll(/->\s*([A-Za-z_][A-Za-z0-9_]*)/g)].map((item) => item[1]!) : undefined;
      rest = rest.slice(variableMatch[0].length).trimStart();
    }
    if (!parsed.type) errors.push({ start: bodyStart, end: bodyStart + clean.length, message: `Expected a type for @${name}.` });
    tags.push({ name, dialect, type: parsed.type, variable, propertyPath: propertyPath?.length ? propertyPath : undefined,
      description: rest, start: baseOffset + match.index, end: bodyStart + clean.length });
  }
  return { tags, errors };
}

export function displayPhpDocType(type: PhpDocType): string {
  switch (type.kind) {
    case 'name': return type.name;
    case 'literal': return type.raw;
    case 'negated': return `!${type.type.kind === 'union' || type.type.kind === 'intersection' ? `(${displayPhpDocType(type.type)})` : displayPhpDocType(type.type)}`;
    case 'nullable': return `?${type.type.kind === 'union' || type.type.kind === 'intersection' ? `(${displayPhpDocType(type.type)})` : displayPhpDocType(type.type)}`;
    case 'conditional': return `(${displayPhpDocType(type.subject)} is${type.negated ? ' not' : ''} ${displayPhpDocType(type.target)} ? ${displayPhpDocType(type.ifTrue)} : ${displayPhpDocType(type.ifFalse)})`;
    case 'union': return type.types.map(displayPhpDocType).join('|');
    case 'intersection': return type.types.map(displayPhpDocType).join('&');
    case 'generic': return `${displayPhpDocType(type.base)}<${type.arguments.map(displayPhpDocType).join(', ')}>`;
    case 'callable': return `${type.callableName}(${type.parameters.map((parameter) => `${parameter.variadic ? '...' : ''}${displayPhpDocType(parameter.type)}${parameter.name ? ` $${parameter.name}` : ''}${parameter.optional ? '=' : ''}`).join(', ')})${type.returnType ? `: ${displayPhpDocType(type.returnType)}` : ''}`;
    case 'array': return `${type.element.kind === 'union' || type.element.kind === 'intersection' ? `(${displayPhpDocType(type.element)})` : displayPhpDocType(type.element)}[]`;
    case 'shape': return `${type.shapeKind}{${type.fields.map((field) => `${field.key === undefined ? '' : `${field.key}${field.optional ? '?' : ''}: `}${displayPhpDocType(field.type)}`).join(', ')}}`;
  }
}
