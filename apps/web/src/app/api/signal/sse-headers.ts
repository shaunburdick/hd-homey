/**
 * Shared SSE response headers for all signal streaming endpoints.
 *
 * Applied to every `text/event-stream` response to ensure consistent
 * cache, buffering, and security behaviour across all SSE routes.
 *
 * @module app/api/signal/sse-headers
 */

/**
 * Standard HTTP headers for Server-Sent Events responses.
 *
 * - `Content-Type`: Required for browser EventSource API recognition.
 * - `Cache-Control`: Prevents intermediaries from caching the stream.
 * - `Connection`: Keeps the underlying TCP connection alive.
 * - `X-Accel-Buffering`: Disables nginx proxy buffering for real-time delivery.
 * - `X-Content-Type-Options`: Prevents MIME sniffing attacks.
 */
export const SSE_HEADERS: Record<string, string> = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'X-Content-Type-Options': 'nosniff',
};
