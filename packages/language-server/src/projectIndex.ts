import { indexComposerSources, type ProjectIndexLimits, type ProjectIndexResult } from '@php-companion/index';
import type { SemanticWorkspace } from '@php-companion/semantic';

export type { ProjectIndexLimits, ProjectIndexResult } from '@php-companion/index';

export function indexComposerRoot(root: string, workspace: SemanticWorkspace, limits?: ProjectIndexLimits, shouldContinue: () => boolean = () => true): Promise<ProjectIndexResult> {
  return indexComposerSources(root, { limits, shouldContinue, onSource: ({ uri, source }) => workspace.update(uri, source) });
}
