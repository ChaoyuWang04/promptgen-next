/**
 * Module Builders Export
 *
 * Central export for all 7 module builders.
 * Each module generates a specific segment of the prompt.
 */

export { CharacterModule } from './character';
export { PoseModule } from './pose';
export { SceneModule } from './scene';
export { ThemeModule } from './theme';
export { LightingModule } from './lighting';
export { StyleModule } from './style';
export { CompositionModule } from './composition';

export const ALL_MODULES = {
  character: 'CharacterModule',
  pose: 'PoseModule',
  scene: 'SceneModule',
  theme: 'ThemeModule',
  lighting: 'LightingModule',
  style: 'StyleModule',
  composition: 'CompositionModule',
} as const;
