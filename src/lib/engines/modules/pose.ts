/**
 * Pose Module Builder
 *
 * Generates pose/gesture description segment including:
 * - Pose name
 * - Body orientation
 * - Head orientation
 * - Arm and leg positions
 * - Emotions
 */

import { type ModuleBuilder, type TemplateContext } from '../types';

export const PoseModule: ModuleBuilder = {
  name: 'pose',

  build(context: TemplateContext): string {
    const pose = context.pose;

    if (!pose) {
      throw new Error('Pose data not found in context');
    }

    const parts: string[] = [];

    // Pose name
    if (pose.pose_name) {
      parts.push(`姿态: ${pose.pose_name}`);
    }

    // Body orientation
    if (pose.body_orientation) {
      parts.push(`身体朝向: ${pose.body_orientation}`);
    }

    // Head orientation
    if (pose.head_orientation) {
      parts.push(`头部朝向: ${pose.head_orientation}`);
    }

    // Arm position
    if (pose.arm_position) {
      parts.push(`手臂位置: ${pose.arm_position}`);
    }

    // Leg position
    if (pose.leg_position) {
      parts.push(`腿部位置: ${pose.leg_position}`);
    }

    // Emotions (join array if present)
    if (pose.emotion && Array.isArray(pose.emotion) && pose.emotion.length > 0) {
      parts.push(`情绪: ${pose.emotion.join(', ')}`);
    }

    return parts.join('\n');
  },
};
