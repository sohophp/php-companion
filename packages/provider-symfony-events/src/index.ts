import { readFile, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  analyzeSymfonyEventDispatches,
  analyzeSymfonyEventSubscriptions,
  analyzeSymfonyInheritedEventListenerAttributes,
  analyzeSymfonyInheritedEventSubscriptions,
} from '@php-companion/framework-symfony';
import type { PhpSyntaxParser } from '@php-companion/parser';
import type {
  ExternalContainerServiceFact,
  ExternalEventDispatchFact,
  ExternalEventSubscriptionFact,
  SemanticProviderDocument,
  SemanticProviderEffectiveMethod,
  SemanticProviderProjectType,
} from '@php-companion/semantic-provider';

export interface SymfonyEventProviderOptions {
  projectTypes: readonly SemanticProviderProjectType[];
  containerServices: readonly ExternalContainerServiceFact[];
  documents?: readonly SemanticProviderDocument[];
  maxFiles?: number;
  maxTotalBytes?: number;
}
export interface SymfonyEventProviderFacts {
  subscriptions: ExternalEventSubscriptionFact[];
  dispatches: ExternalEventDispatchFact[];
  sourceUris: string[];
}
interface ProjectSource { path: string; uri: string; source: string; }

function within(root: string, candidate: string): boolean {
  const local = relative(root, candidate);
  return local === '' || (!isAbsolute(local) && local !== '..' && !local.startsWith(`..${sep}`));
}

function keyOfSubscription(fact: ExternalEventSubscriptionFact): string {
  return `${fact.subscriberFqcn.toLowerCase()}\0${fact.event.toLowerCase()}\0${fact.listener.toLowerCase()}\0${fact.uri}\0${fact.eventStart}\0${fact.listenerStart}`;
}
function keyOfDispatch(fact: ExternalEventDispatchFact): string {
  return `${fact.event.toLowerCase()}\0${fact.uri}\0${fact.eventStart}\0${fact.dispatchStart}`;
}

async function projectSources(root: string, types: readonly SemanticProviderProjectType[], documents: readonly SemanticProviderDocument[],
  maxFiles: number, maxTotalBytes: number): Promise<ProjectSource[]> {
  const pathByUri = new Map(types.map((type) => [type.uri, resolve(type.path)]));
  const snapshots = new Map<string, SemanticProviderDocument>();
  for (const document of documents) {
    let path = pathByUri.get(document.uri);
    if (!path) try { path = resolve(fileURLToPath(document.uri)); } catch { /* Non-file URIs can still match a project type URI. */ }
    if (path && within(root, path) && document.languageId === 'php') snapshots.set(path, document);
  }
  const unique = new Map<string, string>();
  for (const type of types) {
    const path = resolve(type.path); if (!within(root, path)) throw new Error(`Project type path escapes the project root: ${type.path}`);
    if (!unique.has(path)) unique.set(path, type.uri || pathToFileURL(path).toString());
  }
  if (unique.size > maxFiles) throw new Error(`Symfony event source count exceeds ${maxFiles}.`);
  const result: ProjectSource[] = []; let bytes = 0;
  const paths = [...unique].sort(([left], [right]) => left.localeCompare(right));
  // Bound concurrent IO while preserving source order and all-or-nothing facts.
  for (let index = 0; index < paths.length; index += 8) {
    const batch = await Promise.all(paths.slice(index, index + 8).map(async ([path, uri]) => {
      const actual = await realpath(path); if (!within(root, actual)) throw new Error(`Project type resolves outside the project root: ${path}`);
      const snapshot = snapshots.get(path); const source = snapshot?.source ?? await readFile(actual, 'utf8');
      if (source.length > 1_000_000) throw new Error(`Symfony event source budget exceeds ${maxTotalBytes} bytes.`);
      return { path, uri: snapshot?.uri ?? uri, source };
    }));
    for (const source of batch) {
      bytes += Buffer.byteLength(source.source);
      if (bytes > maxTotalBytes) throw new Error(`Symfony event source budget exceeds ${maxTotalBytes} bytes.`);
      result.push(source);
    }
  }
  return result;
}

/** Collect a complete static event-relation snapshot without booting Symfony or executing project PHP. */
export async function collectSymfonyEventFacts(rootPath: string, parser: PhpSyntaxParser,
  options: SymfonyEventProviderOptions): Promise<SymfonyEventProviderFacts> {
  const root = await realpath(resolve(rootPath));
  const sources = await projectSources(root, options.projectTypes, options.documents ?? [], options.maxFiles ?? 10_000,
    options.maxTotalBytes ?? 128 * 1024 * 1024);
  const sourcesByUri = new Map(sources.map((source) => [source.uri, source.source]));
  const types = new Map(options.projectTypes.map((type) => [type.fqcn.toLowerCase(), type]));
  const registeredClasses = [...new Set(options.containerServices.map((service) => service.className))];
  const registered = new Set(registeredClasses.map((fqcn) => fqcn.toLowerCase()));
  const methods = (fqcn: string): readonly SemanticProviderEffectiveMethod[] => types.get(fqcn.toLowerCase())?.effectiveMethods ?? [];
  const publicInstanceMethod = (fqcn: string, name: string): SemanticProviderEffectiveMethod | undefined => {
    const matches = methods(fqcn).filter((method) => !method.static && method.name.toLowerCase() === name.toLowerCase());
    return matches.length === 1 ? matches[0] : undefined;
  };
  const publicStaticMethod = (fqcn: string, name: string): SemanticProviderEffectiveMethod | undefined => {
    const matches = methods(fqcn).filter((method) => method.static && method.name.toLowerCase() === name.toLowerCase());
    return matches.length === 1 ? matches[0] : undefined;
  };
  const direct = sources.filter(({ source }) => source.includes('getSubscribedEvents') || source.toLowerCase().includes('aseventlistener'))
    .flatMap(({ uri, source }) => analyzeSymfonyEventSubscriptions(parser, uri, source,
      (owner, listener) => publicInstanceMethod(owner, listener) !== undefined))
    .filter((fact) => registered.has(fact.subscriberFqcn.toLowerCase()));
  const subscriberInterface = 'Symfony\\Component\\EventDispatcher\\EventSubscriberInterface';
  const subscriberClasses = registeredClasses.filter((fqcn) => types.get(fqcn.toLowerCase())?.supertypes
    ?.some((supertype) => supertype.toLowerCase() === subscriberInterface.toLowerCase()));
  const inherited = subscriberClasses.flatMap((subscriber) => {
      const provider = publicStaticMethod(subscriber, 'getSubscribedEvents');
      const identity = provider?.declarationFqcn ?? provider?.fqcn; const providerFqcn = identity?.split('::')[0];
      const sourceMethodName = provider?.declarationName ?? provider?.name;
      if (!provider || !providerFqcn || providerFqcn.toLowerCase() === subscriber.toLowerCase()) return [];
      const source = sourcesByUri.get(provider.uri); if (!source) return [];
      return analyzeSymfonyInheritedEventSubscriptions(parser, provider.uri, source, providerFqcn, subscriber,
        (owner, listener) => publicInstanceMethod(owner, listener) !== undefined, {
          selfFqcn: provider.typeScopeFqcn,
          staticFqcn: subscriber,
          parentFqcn: provider.typeScopeFqcn ? types.get(provider.typeScopeFqcn.toLowerCase())?.directParentFqcn : undefined,
        }, sourceMethodName);
    });
  const inheritedAttributes = registeredClasses.flatMap((subscriber) => methods(subscriber).filter((method) => !method.static)
      .flatMap((method) => {
        const providerFqcn = (method.declarationFqcn ?? method.fqcn).split('::')[0];
        const sourceMethodName = method.declarationName ?? method.name;
        if (!providerFqcn || (!method.declarationFqcn && providerFqcn.toLowerCase() === subscriber.toLowerCase())) return [];
        const source = sourcesByUri.get(method.uri);
        if (!source?.toLowerCase().includes('aseventlistener')) return [];
        return analyzeSymfonyInheritedEventListenerAttributes(parser, method.uri, source, providerFqcn, subscriber,
          sourceMethodName, method.name, {
            providerParentFqcn: types.get(providerFqcn.toLowerCase())?.directParentFqcn,
            subscriberParentFqcn: types.get(subscriber.toLowerCase())?.directParentFqcn,
          });
      }));
  const subscriptions = [...new Map([...direct, ...inherited, ...inheritedAttributes]
    .map((fact) => [keyOfSubscription(fact), fact])).values()]
    .sort((left, right) => left.uri.localeCompare(right.uri) || left.eventStart - right.eventStart || left.listenerStart - right.listenerStart);
  const dispatches = [...new Map(sources.filter(({ source }) => source.toLowerCase().includes('dispatch'))
    .flatMap(({ uri, source }) => analyzeSymfonyEventDispatches(parser, uri, source))
    .map((fact) => [keyOfDispatch(fact), fact])).values()]
    .sort((left, right) => left.uri.localeCompare(right.uri) || left.eventStart - right.eventStart || left.dispatchStart - right.dispatchStart);
  return { subscriptions, dispatches, sourceUris: sources.map((source) => source.uri) };
}
