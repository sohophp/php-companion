import { parsePhpDocType, type PhpDocType } from '@php-companion/phpdoc';

export type PhpDocNameRole = 'type' | 'generic-base' | 'integer-bound' | 'callable';

/** Bind only parsed names. Preserve grouping, keys, literals and parameter names. */
export function bindPhpDocTypeNames(text: string,
  resolve: (name: string, role: PhpDocNameRole) => string | undefined): string | undefined {
  if (text.length > 131_072) return undefined;
  const parsed = parsePhpDocType(text);
  if (!parsed.type || parsed.errors.length || text.slice(parsed.consumed).trim()) return undefined;
  const edits: Array<{ start: number; end: number; text: string }> = [];
  let remaining = 256, complete = true;
  const bind = (type: PhpDocType, name: string, role: PhpDocNameRole): void => {
    const replacement = resolve(name, role);
    if (replacement === undefined) { complete = false; return; }
    if (replacement === name) return;
    const segment = text.slice(type.start,type.end);
    const at = role === 'callable' ? segment.indexOf(name) : segment.lastIndexOf(name);
    if (at < 0) { complete = false; return; }
    edits.push({start:type.start+at,end:type.start+at+name.length,text:replacement});
  };
  const visit = (type: PhpDocType, role: PhpDocNameRole = 'type'): void => {
    if (!complete || remaining-- <= 0) { complete = false; return; }
    switch (type.kind) {
      case 'name': bind(type,type.name,role); break;
      case 'literal': break;
      case 'nullable': case 'negated': visit(type.type); break;
      case 'array': visit(type.element); break;
      case 'union': case 'intersection': type.types.forEach(member=>visit(member)); break;
      case 'conditional': [type.subject,type.target,type.ifTrue,type.ifFalse].forEach(member=>visit(member)); break;
      case 'generic': {
        visit(type.base,'generic-base');
        const role = type.base.kind==='name' && type.base.name.toLowerCase()==='int' ? 'integer-bound' : 'type';
        type.arguments.forEach(member=>visit(member,role)); break;
      }
      case 'shape': type.fields.forEach(field=>visit(field.type)); break;
      case 'callable':
        bind(type,type.callableName,'callable');
        type.parameters.forEach(parameter=>visit(parameter.type));
        if (type.returnType) visit(type.returnType);
    }
  };
  visit(parsed.type);
  if (!complete) return undefined;
  let bound = text;
  for (const edit of edits.sort((left,right)=>right.start-left.start))
    bound=bound.slice(0,edit.start)+edit.text+bound.slice(edit.end);
  return bound;
}
