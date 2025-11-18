/**
 * Queue System Types
 * Defines job data structures and queue names for BullMQ
 */

import { LanguageId } from '../generators/image-generator';

/**
 * Queue names
 */
export enum QueueName {
  IMAGE_GENERATION = 'image-generation',
}

/**
 * Job data for single image generation
 */
export interface ImageGenerationJobData {
  /**
   * Image ID to generate
   */
  imageId: string;

  /**
   * Language IDs to generate final images for
   */
  languageIds: LanguageId[];

  /**
   * Optional batch ID if part of a batch
   */
  batchId?: string;

  /**
   * Whether to overwrite existing images
   */
  overwrite?: boolean;
}

/**
 * Job result for successful image generation
 */
export interface ImageGenerationJobResult {
  /**
   * Image ID that was generated
   */
  imageId: string;

  /**
   * Version number created
   */
  version: number;

  /**
   * Provider used
   */
  provider: string;

  /**
   * Paths to generated images
   */
  paths: {
    mainImage: string;
    diffImage: string;
    finalImages: Record<string, string>;
  };

  /**
   * Total generation time in milliseconds
   */
  totalTimeMs: number;
}

/**
 * Job failure data
 */
export interface ImageGenerationJobFailure {
  /**
   * Image ID that failed
   */
  imageId: string;

  /**
   * Error message
   */
  error: string;

  /**
   * Error stack trace
   */
  stack?: string;

  /**
   * Provider attempts made
   */
  attempts?: unknown[];
}

/**
 * Queue configuration
 */
export interface QueueConfig {
  /**
   * Redis host
   */
  host: string;

  /**
   * Redis port
   */
  port: number;

  /**
   * Redis password (optional)
   */
  password?: string;

  /**
   * Redis database number
   */
  db: number;

  /**
   * Worker concurrency (how many jobs to process simultaneously)
   */
  concurrency: number;

  /**
   * Maximum retry attempts for failed jobs
   */
  maxRetries: number;
}
