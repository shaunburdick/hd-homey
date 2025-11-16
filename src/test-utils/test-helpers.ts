import { vi } from 'vitest';

/**
 * Common test utilities and helpers
 */

/**
 * Wait for a specified amount of time
 */
export function wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Mock fetch responses
 */
export function createMockFetch(response: unknown, status = 200) {
    return vi.fn(() =>
        Promise.resolve({
            ok: status >= 200 && status < 300,
            status,
            json: () => Promise.resolve(response),
            text: () => Promise.resolve(JSON.stringify(response)),
            headers: new Headers(),
            statusText: status === 200 ? 'OK' : 'Error'
        } as Response));
}

/**
 * Mock http.get for streaming tests
 */
export function createMockHttpGet() {
    return vi.fn((url, callback) => {
        const mockResponse = {
            statusCode: 200,
            headers: { 'content-type': 'video/mp2t' },
            on: vi.fn(),
            pipe: vi.fn()
        };

        if (typeof callback === 'function') {
            callback(mockResponse);
        }

        return { on: vi.fn(), abort: vi.fn() };
    });
}

/**
 * Create a mock IncomingMessage for streaming tests
 */
export function createMockStream(statusCode = 200) {
    return {
        statusCode,
        headers: { 'content-type': 'video/mp2t' },
        on: vi.fn(),
        pipe: vi.fn(),
        read: vi.fn(),
        destroy: vi.fn()
    };
}

/**
 * Assert that an error was thrown
 */
export async function expectToThrow(fn: () => Promise<unknown>, errorMessage?: string) {
    try {
        await fn();
        throw new Error('Expected function to throw, but it did not');
    } catch (error) {
        if (errorMessage && error instanceof Error) {
            expect(error.message).toContain(errorMessage);
        }
    }
}

/**
 * Create a mock FormData object
 */
export function createMockFormData(data: Record<string, string>): FormData {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
        formData.append(key, value);
    });
    return formData;
}
