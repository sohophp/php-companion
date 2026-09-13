import { describe, expect, it } from 'vitest';
import { INTEROP_PROTOCOL_VERSION, isInteropHello, mergeControllerContexts, negotiateInterop, toTwigMetadataContext, type ControllerTemplateContext, type InteropHello } from '../src/index.js';

const hello = (providerId: string, capabilities: InteropHello['capabilities']): InteropHello => ({ protocolVersion: INTEROP_PROTOCOL_VERSION, providerId, projectId: 'workspace-1', snapshotVersion: 'sha256:1', capabilities });
const context = (variables: ControllerTemplateContext['variables'], symbol: string): ControllerTemplateContext => ({
  template: 'site/page.html.twig', complete: true, variables,
  sources: [{ symbol, location: { uri: `file:///src/${symbol}.php`, start: 10, end: 20, snapshotVersion: 'sha256:1' } }],
});

describe('versioned PHP/template interop contract', () => {
  it('negotiates only shared capabilities for the same project', () => {
    const local = hello('php-companion', ['controller-contexts', 'definitions']);
    expect(negotiateInterop(local, hello('twig-plus', ['controller-contexts']), ['controller-contexts'])).toEqual({ compatible: true, capabilities: ['controller-contexts'] });
    expect(negotiateInterop(local, { ...hello('twig-plus', []), protocolVersion: 2 }, ['controller-contexts'])).toMatchObject({ compatible: false, capabilities: [] });
    expect(isInteropHello({ ...hello('twig-plus', []), capabilities: ['unknown'] })).toBe(false);
  });

  it('merges multiple controller contexts without turning conditional variables into required ones', () => {
    const firstSource = { uri: 'file:///src/Page.php', start: 30, end: 34, snapshotVersion: 'sha256:1' };
    const secondSource = { uri: 'file:///src/Admin.php', start: 40, end: 44, snapshotVersion: 'sha256:1' };
    const merged = mergeControllerContexts([
      context([{ name: 'user', type: { kind: 'named', name: 'App\\User' }, optional: false, sources: [firstSource] }, { name: 'page', type: { kind: 'primitive', name: 'int' }, optional: false }], 'PageController::show'),
      context([{ name: 'user', type: { kind: 'named', name: 'App\\Admin' }, optional: false, sources: [secondSource] }], 'AdminController::show'),
    ]);
    expect(merged).toMatchObject({ complete: true, variables: [
      { name: 'page', type: { kind: 'primitive', name: 'int' }, optional: true },
      { name: 'user', type: { kind: 'union' }, optional: false, sources: [firstSource, secondSource] },
    ], sources: [{ symbol: 'PageController::show' }, { symbol: 'AdminController::show' }] });
    expect(toTwigMetadataContext(merged!)).toMatchObject({ variables: { page: 'int', user: 'App\\User|App\\Admin' } });
  });

  it('propagates incomplete and unknown source facts instead of guessing', () => {
    const incomplete = { ...context([{ name: 'value', type: { kind: 'unknown' as const }, optional: false }], 'DynamicController::show'), complete: false };
    expect(mergeControllerContexts([incomplete])).toMatchObject({ complete: false, variables: [{ name: 'value', type: { kind: 'unknown' } }] });
    expect(mergeControllerContexts([incomplete, { ...incomplete, template: 'other.html.twig' }])).toBeUndefined();
  });
});
