import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { PassThrough, Writable } from 'node:stream';
import type { ChildProcess } from 'node:child_process';

type Id = number | string | null;
interface Message {
  id?: Id;
  method?: string;
  params?: {
    initializationOptions?: { testMode?: unknown };
    method?: unknown;
    uri?: unknown;
    version?: unknown;
    textDocument?: { uri?: unknown };
  };
  result?: unknown;
  error?: unknown;
}
interface Frame { raw: Buffer; body: Buffer; value: Message; }
interface GateEvent {
  kind: string;
  atMs: number;
  id?: Id;
  uri?: string;
  version?: number;
  sha256?: string;
  actualResult?: false;
}
export interface ProductionGateSnapshot {
  serverPid: number;
  initializations: Array<{ id?: Id; testMode: false }>;
  armed: boolean;
  reserved: Id | undefined;
  held: { id?: Id; sha256: string } | null;
  versions: Record<string, number>;
  events: GateEvent[];
  backendGuardRejections: number;
  semanticFramesForwarded: number;
  controlledRequests: number;
  backendExit: { code: number | null; signal: NodeJS.Signals | null } | null;
  transportErrors: string[];
  inputBufferedBytes: number;
  outputBufferedBytes: number;
}
export interface ProductionResponseGate { snapshot(): ProductionGateSnapshot; }

function sha(bytes: Buffer): string { return createHash('sha256').update(bytes).digest('hex'); }
function encode(id: Id, result: unknown): Buffer {
  const body = Buffer.from(JSON.stringify({ jsonrpc: '2.0', id, result }));
  return Buffer.concat([Buffer.from(`Content-Length: ${body.length}\r\n\r\n`), body]);
}

// Preserve each complete frame's original bytes; only harness control replies are encoded here.
class Frames {
  private buffer: Buffer = Buffer.alloc(0);
  get pendingBytes(): number { return this.buffer.length; }
  push(chunk: Buffer): Frame[] {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    const rows: Frame[] = [];
    for (;;) {
      const end = this.buffer.indexOf('\r\n\r\n');
      if (end < 0) break;
      const match = /(?:^|\r\n)Content-Length:\s*(\d+)(?:\r\n|$)/i.exec(this.buffer.subarray(0, end).toString());
      assert.ok(match, 'LSP Content-Length is required');
      const length = Number(match[1]);
      assert.ok(length <= 64 * 1024 * 1024, 'Oversized test transport frame');
      if (this.buffer.length < end + 4 + length) break;
      const raw = this.buffer.subarray(0, end + 4 + length);
      const body = this.buffer.subarray(end + 4, end + 4 + length);
      rows.push({ raw, body, value: JSON.parse(body.toString()) as Message });
      this.buffer = this.buffer.subarray(raw.length);
    }
    return rows;
  }
}

/** Test-only transport delay; the actual server must reject its Test-mode query hook. */
export function attachProductionResponseGate(child: ChildProcess,
  changed: (snapshot: ProductionGateSnapshot) => void = () => undefined): ProductionResponseGate {
  const stdin = child.stdin, stdout = child.stdout;
  assert.ok(stdin && stdout && child.pid, 'A running stdio server is required');
  const input = new Frames(), output = new Frames(), readable = new PassThrough();
  let held: Frame | null = null;
  const state: ProductionGateSnapshot = { serverPid: child.pid, initializations: [], armed: false,
    reserved: undefined, held: null, versions: {}, events: [], backendGuardRejections: 0,
    semanticFramesForwarded: 0, controlledRequests: 0, backendExit: null, transportErrors: [],
    inputBufferedBytes: 0, outputBufferedBytes: 0 };
  const guards = new Set<Id>();
  const snapshot = (): ProductionGateSnapshot => ({ ...state, initializations: [...state.initializations],
    versions: { ...state.versions }, events: [...state.events], transportErrors: [...state.transportErrors],
    held: held ? { id: held.value.id, sha256: sha(held.raw) } : null,
    inputBufferedBytes: input.pendingBytes, outputBufferedBytes: output.pendingBytes });
  const event = (kind: string, detail: Omit<GateEvent, 'kind' | 'atMs'> = {}): void => {
    state.events.push({ kind, atMs: performance.now(), ...detail }); changed(snapshot());
  };
  const reply = (id: Id, result: unknown): void => { readable.write(encode(id, result)); };
  const receive = (frame: Frame): void => {
    const message = frame.value;
    if (message.method === 'initialize') {
      assert.equal(message.params?.initializationOptions?.testMode, false);
      state.initializations.push({ id: message.id, testMode: false }); event('production-initialize', { id: message.id });
    }
    if (message.id !== undefined && message.method === 'phpCompanion/testPauseNextQuery' && message.params?.method === 'hover') {
      assert.ok(!state.armed && state.reserved === undefined && !held);
      guards.add(message.id); state.controlledRequests++;
      // Let the real production server reject the hook before arming the external delay.
      stdin.write(frame.raw); return;
    }
    if (message.id !== undefined && message.method === 'phpCompanion/testQueryState' && message.params?.method === 'hover') {
      assert.equal(typeof message.params.uri, 'string'); state.controlledRequests++;
      reply(message.id, { paused: Boolean(held), version: state.versions[message.params.uri as string] ?? null }); return;
    }
    if (message.id !== undefined && message.method === 'phpCompanion/testReleaseQuery' && message.params?.method === 'hover') {
      state.controlledRequests++;
      if (!held) { reply(message.id, false); return; }
      const delayed = held; held = null; state.reserved = undefined;
      readable.write(delayed.raw); state.semanticFramesForwarded++;
      event('release-real-response', { id: delayed.value.id, sha256: sha(delayed.raw) });
      reply(message.id, true); return;
    }
    if (message.id !== undefined && message.method === 'textDocument/hover' && state.armed) {
      assert.equal(typeof message.params?.textDocument?.uri, 'string');
      state.armed = false; state.reserved = message.id;
      event('reserve-hover', { id: message.id, uri: message.params?.textDocument?.uri as string });
    }
    stdin.write(frame.raw);
  };
  const deliver = (frame: Frame): void => {
    const message = frame.value;
    if (message.id !== undefined && guards.delete(message.id)) {
      assert.equal(message.result, false, 'Production server must reject its Test-only pause hook');
      state.backendGuardRejections++; state.armed = true;
      event('backend-test-hook-rejected', { id: message.id, actualResult: false });
      reply(message.id, true); return;
    }
    if (message.method === 'phpCompanion/versionedDiagnostics') {
      assert.equal(typeof message.params?.uri, 'string'); assert.equal(typeof message.params?.version, 'number');
      const uri = message.params!.uri as string, version = message.params!.version as number;
      state.versions[uri] = version;
      if (held) event('backend-version-confirmed', { uri, version });
    }
    if (message.id !== undefined && message.id === state.reserved) {
      assert.ok(!held && !message.error, 'Hold only an actual successful Hover response');
      held = frame; event('hold-real-response', { id: message.id, sha256: sha(frame.raw) }); return;
    }
    readable.write(frame.raw); state.semanticFramesForwarded++;
  };
  const writable = new Writable({
    write(chunk: Buffer, _encoding, done): void {
      try { for (const frame of input.push(chunk)) receive(frame); done(); }
      catch (error) { done(error as Error); }
    },
    final(done): void { assert.equal(input.pendingBytes, 0); stdin.end(done); },
  });
  stdin.on('error', error => { state.transportErrors.push(String(error)); writable.destroy(error); });
  stdout.on('data', (chunk: Buffer) => {
    try { for (const frame of output.push(chunk)) deliver(frame); }
    catch (error) { state.transportErrors.push(String(error)); readable.destroy(error as Error); }
  });
  stdout.on('end', () => { assert.equal(output.pendingBytes, 0); readable.end(); });
  stdout.on('error', error => { state.transportErrors.push(String(error)); readable.destroy(error); });
  child.on('exit', (code, signal) => { state.backendExit = { code, signal }; changed(snapshot()); });
  child.stdin = writable; child.stdout = readable;
  return { snapshot };
}
