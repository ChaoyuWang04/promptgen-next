/**
 * Image Generation Progress API (Server-Sent Events)
 * GET /api/images/progress/[imageId]
 * Streams real-time progress updates for image generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { createQueueEvents } from '@/lib/queue/image-generation-queue';

/**
 * GET /api/images/progress/[imageId]
 * Stream progress updates via Server-Sent Events
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
) {
  const { imageId } = await params;

  console.log(`[API] SSE progress stream started for ${imageId}`);

  // Create a ReadableStream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Helper to send SSE message
      const sendEvent = (event: string, data: unknown) => {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      try {
        // Send initial status
        const record = await prisma.record.findUnique({
          where: { imageId },
          include: {
            variants: {
              orderBy: { version: 'desc' },
              take: 1,
            },
          },
        });

        if (!record) {
          sendEvent('error', {
            code: 'NOT_FOUND',
            message: `Record not found: ${imageId}`,
          });
          controller.close();
          return;
        }

        sendEvent('status', {
          imageId,
          imageGenerated: record.imageGenerated,
          latestVersion: record.variants[0]?.version || 0,
        });

        // Set up queue events listener
        const queueEvents = createQueueEvents();

        // Listen for job progress
        queueEvents.on('progress', async ({ jobId, data }) => {
          // Check if this job is for our imageId
          const client = await queueEvents.client;
          const job = await client.get(`bull:image-generation:${jobId}`);
          if (job && JSON.parse(job as string).imageId === imageId) {
            sendEvent('progress', {
              imageId,
              progress: data,
              jobId,
            });
          }
        });

        // Listen for job completion
        queueEvents.on('completed', async ({ jobId, returnvalue }) => {
          const result = returnvalue as any;
          if (result?.imageId === imageId) {
            sendEvent('completed', {
              imageId,
              version: result.version,
              provider: result.provider,
              paths: result.paths,
              totalTimeMs: result.totalTimeMs,
            });

            // Close stream after completion
            setTimeout(() => {
              controller.close();
              queueEvents.close();
            }, 1000);
          }
        });

        // Listen for job failure
        queueEvents.on('failed', async ({ jobId, failedReason }) => {
          // Check if this job is for our imageId
          try {
            const client = await queueEvents.client;
            const job = await client.get(`bull:image-generation:${jobId}`);
            if (job && JSON.parse(job as string).imageId === imageId) {
              sendEvent('failed', {
                imageId,
                error: failedReason,
              });

              // Close stream after failure
              setTimeout(() => {
                controller.close();
                queueEvents.close();
              }, 1000);
            }
          } catch (error) {
            console.error('[API] Failed to parse job data:', error);
          }
        });

        // Keep connection alive with heartbeat
        const heartbeatInterval = setInterval(() => {
          sendEvent('heartbeat', { timestamp: new Date().toISOString() });
        }, 15000); // Every 15 seconds

        // Clean up on client disconnect
        request.signal.addEventListener('abort', () => {
          console.log(`[API] SSE client disconnected for ${imageId}`);
          clearInterval(heartbeatInterval);
          queueEvents.close();
          controller.close();
        });
      } catch (error) {
        console.error('[API] SSE stream error:', error);
        sendEvent('error', {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Stream error',
        });
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
