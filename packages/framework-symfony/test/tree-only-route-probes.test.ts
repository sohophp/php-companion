import { describe, expect, it, vi } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { symfonyRouteCallAt, symfonyRouteParameterCallAt } from '../src/index.js';

describe('route syntax probes without unused mutable facts', () => {
  it.each([false, true])('preserves exact positions and changed-source results, cached=%s', async cached => {
    const parser = await PhpSyntaxParser.createDefault(); const uri = 'file:///RouteProbe.php';
    const source = `<?php /* 中文 🙂 */ $router->generate('account.show', ['id' => 1, 'lang' => 'en']);`;
    if (cached) parser.parse(source, undefined, uri).tree.delete();
    // These probes use syntax only, even if a full-fact result already exists.
    const parse = vi.spyOn(parser, 'parse').mockImplementation(() => { throw new Error('Unused PHP facts requested'); });
    try {
      const route = symfonyRouteCallAt(parser, uri, source, source.indexOf('account.show') + 4);
      expect(route).toMatchObject({ start: source.indexOf('account.show'), end: source.indexOf('account.show') + 'account.show'.length, prefix: 'acco' });
      const parameter = symfonyRouteParameterCallAt(parser, uri, source, source.indexOf('lang') + 2);
      expect(parameter).toMatchObject({ routeName: 'account.show', prefix: 'la', existingKeys: ['id'], start: source.indexOf('lang') });
      const changed = source.replace('account.show', 'account.changed').replace("'lang'", "'locale'");
      expect(symfonyRouteCallAt(parser, uri, changed, changed.indexOf('account.changed') + 7))
        .toMatchObject({ prefix: 'account', end: changed.indexOf('account.changed') + 'account.changed'.length });
      expect(symfonyRouteParameterCallAt(parser, uri, changed, changed.indexOf('locale') + 3))
        .toMatchObject({ routeName: 'account.changed', prefix: 'loc', existingKeys: ['id'] });
      expect(symfonyRouteCallAt(parser, uri, source, source.indexOf('lang') + 2)).toBeUndefined();
      expect(symfonyRouteParameterCallAt(parser, uri, source, source.indexOf('account.show') + 2)).toBeUndefined();
      const doubleQuoted = source.replaceAll("'", '"');
      expect(symfonyRouteCallAt(parser, uri, doubleQuoted, doubleQuoted.indexOf('account.show') + 4))
        .toMatchObject({ prefix: 'acco' });
      expect(symfonyRouteParameterCallAt(parser, uri, doubleQuoted, doubleQuoted.indexOf('lang') + 2)).toBeUndefined();
      expect(parse).not.toHaveBeenCalled();
    } finally { parse.mockRestore(); parser.dispose(); }
  });
});
