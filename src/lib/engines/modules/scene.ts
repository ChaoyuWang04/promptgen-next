/**
 * Scene Module Builder
 *
 * Generates scene/environment description segment including:
 * - Scene name/location
 * - Must-have objects
 * - Optional objects
 * - Layout priorities
 * - Occlusion guards
 */

import { type ModuleBuilder, type TemplateContext } from '../types';

export const SceneModule: ModuleBuilder = {
  name: 'scene',

  build(context: TemplateContext): string {
    const scene = context.scene;

    if (!scene) {
      throw new Error('Scene data not found in context');
    }

    const parts: string[] = [];

    // Scene name/location
    if (scene.scene) {
      parts.push(`场景: ${scene.scene}`);
    }

    // Must objects (core scene elements)
    if (scene.must_objects && Array.isArray(scene.must_objects) && scene.must_objects.length > 0) {
      parts.push(`必须物品: ${scene.must_objects.join(', ')}`);
    }

    // Optional objects (nice-to-have elements)
    if (scene.optional_objects && Array.isArray(scene.optional_objects) && scene.optional_objects.length > 0) {
      parts.push(`可选物品: ${scene.optional_objects.join(', ')}`);
    }

    // Camera preset (framing information)
    if (scene.camera_preset) {
      const cam = scene.camera_preset;
      const camParts: string[] = [];

      if (cam.shot) camParts.push(`景别: ${cam.shot}`);
      if (cam.height) camParts.push(`机位高度: ${cam.height}`);
      if (cam.subject_ratio) camParts.push(`主体占比: ${cam.subject_ratio}`);

      if (camParts.length > 0) {
        parts.push(camParts.join(', '));
      }
    }

    // Layout priority (composition rules)
    if (scene.layout_priority && Array.isArray(scene.layout_priority) && scene.layout_priority.length > 0) {
      parts.push(`布局优先级: ${scene.layout_priority.join('; ')}`);
    }

    // Occlusion guard (prevent blocking)
    if (scene.occlusion_guard && Array.isArray(scene.occlusion_guard) && scene.occlusion_guard.length > 0) {
      parts.push(`遮挡防护: ${scene.occlusion_guard.join('; ')}`);
    }

    return parts.join('\n');
  },
};
