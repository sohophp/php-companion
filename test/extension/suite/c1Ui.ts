import * as assert from 'node:assert';
import * as vscode from 'vscode';

interface VisibleSuggestion {
  elapsedMs: number;
  labels: string[];
}

interface VisibleSuggestionRun {
  samplesMs: number[];
  medianMs: number;
  maxMs: number;
  labels: string[];
}

async function cdpPage(port: number): Promise<string> {
  const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json()) as Array<{
    type: string; title: string; webSocketDebuggerUrl?: string;
  }>;
  const page = targets.find((target) => target.type === 'page' && target.title.includes('Extension Development Host'));
  assert.ok(page?.webSocketDebuggerUrl, 'VS Code did not expose the test Workbench page through Chromium debugging.');
  return page.webSocketDebuggerUrl;
}

async function connect(url: string): Promise<WebSocket> {
  const socket = new WebSocket(url);
  await new Promise<void>((resolve, reject) => {
    socket.addEventListener('open', () => resolve(), { once: true });
    socket.addEventListener('error', () => reject(new Error('Could not connect to the VS Code Workbench debugger.')), { once: true });
  });
  return socket;
}

async function evaluate(socket: WebSocket, expression: string, id: number): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.removeEventListener('message', onMessage); reject(new Error('Workbench evaluation timed out.')); }, 5_000);
    const onMessage = (event: MessageEvent): void => {
      const message = JSON.parse(String(event.data)) as {
        id?: number; error?: { message: string }; result?: { exceptionDetails?: { text: string }; result?: { value?: unknown } };
      };
      if (message.id !== id) return;
      clearTimeout(timer);
      socket.removeEventListener('message', onMessage);
      if (message.error || message.result?.exceptionDetails) reject(new Error(message.error?.message ?? message.result?.exceptionDetails?.text));
      else resolve(message.result?.result?.value);
    };
    socket.addEventListener('message', onMessage);
    socket.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression, returnByValue: true } }));
  });
}

export async function measureVisibleSuggestion(port: number, folder: vscode.Uri, vendor = false): Promise<VisibleSuggestionRun> {
  const socket = await connect(await cdpPage(port));
  let id = 1;
  try {
    const samples: number[] = [];
    let lastLabels: string[] = [];
    for (let index = 0; index < 6; index += 1) {
      const targetName = vendor ? `UiVendorTarget${index}` : `UiTarget${index}`;
      const methodName = vendor ? `vendorVisible${index}` : `renderVisible${index}`;
      const typed = vendor ? 'v' : 'r';
      const source = vendor
        ? `<?php namespace App\\C1; use Acme\\C1\\Bulk\\${targetName}; function uiVendor${index}(${targetName} $value): void { $value->; }`
        : `<?php namespace App\\C1; class ${targetName} { public function ${methodName}(): void {} } function ui${index}(${targetName} $value): void { $value->; }`;
      const uri = vscode.Uri.joinPath(folder, `${vendor ? 'UiVendorSuggestion' : 'UiSuggestion'}${index}.php`);
      await vscode.workspace.fs.writeFile(uri, Buffer.from(source));
      const document = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(document);
      const offset = source.indexOf('$value->;') + '$value->'.length;
      editor.selection = new vscode.Selection(document.positionAt(offset), document.positionAt(offset));
      const priorWidgetVisible = await evaluate(socket, `Boolean(document.querySelector('.suggest-widget.visible'))`, id++);
      assert.strictEqual(priorWidgetVisible, false, 'A previous suggestion widget remained visible before the next typing sample.');
      await evaluate(socket, `(() => {
        globalThis.__sophpSuggestionProbe?.observer.disconnect();
        const probe = { start: performance.now(), elapsedMs: null, labels: [], observer: null };
        const inspect = () => {
          const widget = document.querySelector('.suggest-widget.visible');
          if (!widget || !widget.getBoundingClientRect().width) return;
          const labels = [...widget.querySelectorAll('.monaco-list-row')].map((row) => row.textContent?.trim() ?? '').filter(Boolean);
          if (!labels.length) return;
          probe.elapsedMs = performance.now() - probe.start;
          probe.labels = labels;
          probe.observer.disconnect();
        };
        probe.observer = new MutationObserver(inspect);
        probe.observer.observe(document.body, { attributes: true, childList: true, subtree: true });
        globalThis.__sophpSuggestionProbe = probe;
        return true;
      })()`, id++);
      await vscode.commands.executeCommand('type', { text: typed });
      const deadline = Date.now() + 10_000;
      let visible: VisibleSuggestion | undefined;
      while (Date.now() < deadline) {
        visible = await evaluate(socket, `(() => {
          const probe = globalThis.__sophpSuggestionProbe;
          return probe?.elapsedMs === null ? null : { elapsedMs: probe.elapsedMs, labels: probe.labels };
        })()`, id++) as VisibleSuggestion | undefined;
        if (visible) break;
        await new Promise<void>((resolve) => setTimeout(resolve, 20));
      }
      assert.ok(visible, `Typing did not display a PHP suggestion list in sample ${index}.`);
      assert.ok(visible.labels.some((label) => label.includes(methodName)),
        `The visible PHP suggestion list did not contain ${methodName}: ${JSON.stringify(visible.labels)}`);
      assert.ok(document.isDirty && document.getText().includes(`$value->${typed};`), 'Typing did not update the PHP editor buffer.');
      samples.push(Math.round(visible.elapsedMs));
      lastLabels = visible.labels;
    }
    const sorted = [...samples].sort((left, right) => left - right);
    return { samplesMs: samples, medianMs: Math.round((sorted[2]! + sorted[3]!) / 2), maxMs: sorted[5]!, labels: lastLabels };
  } finally {
    socket.close();
  }
}
