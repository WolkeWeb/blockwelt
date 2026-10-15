import type { WorldOptions } from '../core';
import { TerrainGenerator } from './terrain';
import { executeJob, type EngineJob, type EngineResult } from './workers';

const scope = self as unknown as {
  onmessage: (event: MessageEvent<{ options: WorldOptions } | EngineJob>) => void;
  postMessage: (result: EngineResult, transfer: Transferable[]) => void;
};
let options: WorldOptions;
let terrain: TerrainGenerator;
scope.onmessage = (event) => {
  if ('options' in event.data) {
    options = event.data.options;
    terrain = new TerrainGenerator(options.seed);
    return;
  }
  const result = executeJob(event.data, options, terrain);
  const transfer: Transferable[] = result instanceof Uint16Array ? [result.buffer] :
    [result.opaque, result.cutout, result.translucent].flatMap(b =>
      [b.positions.buffer, b.normals.buffer, b.uvs.buffer, b.colors.buffer, b.light.buffer, b.indices.buffer]);
  scope.postMessage(result, transfer);
};
