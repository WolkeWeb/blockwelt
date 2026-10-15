import { BLOCK, BLOCK_NAMES, type BlockDef } from '../core';
export const BLOCKS: BlockDef[] = Object.values(BLOCK).sort((a, b) => a - b).map((id) => ({
  id, name: BLOCK_NAMES[id], displayName: BLOCK_NAMES[id], hardness: id === BLOCK.BEDROCK ? -1 : 1,
  solid: id !== BLOCK.AIR && id !== BLOCK.WATER && id !== BLOCK.TORCH,
  transparency: id === BLOCK.AIR ? 'invisible' : id === BLOCK.WATER ? 'translucent' : id === BLOCK.LEAVES || id === BLOCK.GLASS || id === BLOCK.TORCH ? 'cutout' : 'opaque',
  shape: id === BLOCK.AIR ? 'none' : id === BLOCK.WATER ? 'liquid' : id === BLOCK.TORCH ? 'torch' : 'cube',
  lightLevel: id === BLOCK.TORCH ? 14 : 0,
  lightOpacity: id === BLOCK.AIR || id === BLOCK.GLASS || id === BLOCK.TORCH ? 0 : id === BLOCK.LEAVES ? 1 : id === BLOCK.WATER ? 2 : 15,
  replaceable: id === BLOCK.AIR || id === BLOCK.WATER, color: 0x808080, textures: null, drop: null,
  preferredTool: null, requiredToolLevel: 0,
}));


