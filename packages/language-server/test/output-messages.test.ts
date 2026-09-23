import { describe, expect, it } from 'vitest';
import { outputMessage, outputProviderSource } from '../src/outputMessages.js';

describe('Language Server output messages', () => {
  it('preserves English Provider warnings and raw failure details', () => {
    expect(outputMessage('en', 'invalidSemanticProvider', outputProviderSource('en', 'bundled')))
      .toBe('Ignored invalid bundled semantic provider configuration.');
    expect(outputMessage('en', 'routeProviderFailed', 'app.routes', 'TIMEOUT', 'request timed out'))
      .toBe('Route provider app.routes failed (TIMEOUT); ignored this query: request timed out');
  });

  it('translates Provider warnings while retaining IDs, codes, and external details', () => {
    expect(outputMessage('zh', 'invalidSemanticProvider', outputProviderSource('zh', 'bundled')))
      .toBe('已忽略内置的语义 Provider 的无效配置。');
    expect(outputMessage('zh', 'routeProviderFailed', 'app.routes', 'TIMEOUT', 'request timed out'))
      .toBe('路由 Provider app.routes 失败（TIMEOUT）；已忽略本次查询：request timed out');
  });

  it('translates operational failures without rewriting raw error details', () => {
    expect(outputMessage('en', 'projectIndexFailed', 'disk full'))
      .toBe('Project indexing failed: disk full');
    expect(outputMessage('zh', 'projectIndexFailed', 'disk full'))
      .toBe('项目索引失败：disk full');
    expect(outputMessage('zh', 'routeProviderFailed', 'app.routes', 'TIMEOUT', 'unexpected {0} and {1}'))
      .toBe('路由 Provider app.routes 失败（TIMEOUT）；已忽略本次查询：unexpected {0} and {1}');
    expect(outputMessage('zh', 'receiverClosureLimit', '/workspace/project'))
      .toBe('/workspace/project 中的引用接收者闭包达到 16 轮上限。');
  });
});
