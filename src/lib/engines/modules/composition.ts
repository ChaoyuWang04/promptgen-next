/**
 * Composition Module Builder
 *
 * Generates composition/framing description segment based on:
 * - Scene camera preset
 * - Scene layout priorities
 * - Character position relative to scene
 *
 * This module synthesizes composition rules from scene and pose modules.
 */

import { type ModuleBuilder, type TemplateContext } from '../types';

export const CompositionModule: ModuleBuilder = {
  name: 'composition',

  build(context: TemplateContext): string {
    const parts: string[] = [];

    // Camera preset from scene
    if (context.scene?.camera_preset) {
      const cam = context.scene.camera_preset;

      if (cam.shot) {
        parts.push(`构图景别: ${cam.shot}`);
      }

      if (cam.height) {
        parts.push(`相机高度: ${cam.height}`);
      }

      if (cam.subject_ratio) {
        parts.push(`主体占比: ${cam.subject_ratio}`);
      }
    }

    // Layout priorities from scene
    if (context.scene?.layout_priority && Array.isArray(context.scene.layout_priority)) {
      const priorities = context.scene.layout_priority;

      if (priorities.length > 0) {
        parts.push(`构图优先级:`);
        priorities.forEach((priority: string) => {
          parts.push(`  - ${priority}`);
        });
      }
    }

    // Occlusion guards (prevent blocking important elements)
    if (context.scene?.occlusion_guard && Array.isArray(context.scene.occlusion_guard)) {
      const guards = context.scene.occlusion_guard;

      if (guards.length > 0) {
        parts.push(`遮挡防护规则:`);
        guards.forEach((guard: string) => {
          parts.push(`  - ${guard}`);
        });
      }
    }

    // Default composition if nothing derived
    if (parts.length === 0) {
      parts.push('构图: 人物居中, 环境作为背景, 三分法构图');
    }

    return parts.join('\n');
  },
};
