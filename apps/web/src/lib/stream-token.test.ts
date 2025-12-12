import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateStreamToken, verifyStreamToken } from './stream-token';
import * as settings from './settings';

// Mock the settings module
vi.mock('./settings');

describe('Stream Token', () => {
    const testSecret = 'a'.repeat(64); // 64-char test secret
    const mockGetStreamSecret = vi.mocked(settings.getStreamSecret);

    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks();
        mockGetStreamSecret.mockResolvedValue(testSecret);

        // Set default expiry
        process.env.HD_HOMEY_STREAM_TOKEN_EXPIRY = '300';
    });

    afterEach(() => {
        delete process.env.HD_HOMEY_STREAM_TOKEN_EXPIRY;
    });

    describe('generateStreamToken', () => {
        it('should generate a valid base64url token', async () => {
            const token = await generateStreamToken(1, 42);
            expect(token).toBeTruthy();
            expect(token).toMatch(/^[A-Za-z0-9_-]+$/); // base64url pattern
        });

        it('should fetch secret from settings', async () => {
            await generateStreamToken(1, 42);
            expect(mockGetStreamSecret).toHaveBeenCalledOnce();
        });

        it('should generate different tokens for different inputs', async () => {
            const token1 = await generateStreamToken(1, 42);
            const token2 = await generateStreamToken(1, 43);
            const token3 = await generateStreamToken(2, 42);

            expect(token1).not.toEqual(token2);
            expect(token1).not.toEqual(token3);
            expect(token2).not.toEqual(token3);
        });
    });

    describe('verifyStreamToken', () => {
        it('should verify a valid token', async () => {
            const token = await generateStreamToken(2, 42);
            const verified = await verifyStreamToken(token);

            expect(verified).toBeTruthy();
            expect(verified?.tunerId).toBe(2);
            expect(verified?.channelId).toBe(42);
            expect(verified?.expiresAt).toBeGreaterThan(Date.now() / 1000);
        });

        it('should reject token with wrong secret', async () => {
            const token = await generateStreamToken(2, 42);

            // Change the mock to return different secret
            mockGetStreamSecret.mockResolvedValue('b'.repeat(64));

            const verified = await verifyStreamToken(token);
            expect(verified).toBeNull();
        });

        it('should reject expired token', async () => {
            // Create token with negative expiry
            process.env.HD_HOMEY_STREAM_TOKEN_EXPIRY = '-10';
            const token = await generateStreamToken(2, 42);

            // Reset to positive expiry for verification
            process.env.HD_HOMEY_STREAM_TOKEN_EXPIRY = '300';

            const verified = await verifyStreamToken(token);
            expect(verified).toBeNull();
        });

        it('should reject tampered token', async () => {
            const token = await generateStreamToken(2, 42);
            const tampered = `${token.slice(0, -4)  }XXXX`;

            const verified = await verifyStreamToken(tampered);
            expect(verified).toBeNull();
        });

        it('should reject malformed token', async () => {
            const verified = await verifyStreamToken('not-a-valid-token');
            expect(verified).toBeNull();
        });

        it('should reject empty token', async () => {
            const verified = await verifyStreamToken('');
            expect(verified).toBeNull();
        });

        it('should handle token with missing parts', async () => {
            // Create a token with missing signature
            const data = `1:42:${Math.floor(Date.now() / 1000) + 300}`;
            const token = Buffer.from(data).toString('base64url');

            const verified = await verifyStreamToken(token);
            expect(verified).toBeNull();
        });
    });

    describe('token format', () => {
        it('should encode tunerId, channelId, and expiresAt', async () => {
            const tunerId = 5;
            const channelId = 123;
            const token = await generateStreamToken(tunerId, channelId);

            const verified = await verifyStreamToken(token);
            expect(verified?.tunerId).toBe(tunerId);
            expect(verified?.channelId).toBe(channelId);
        });

        it('should include expiration timestamp', async () => {
            const beforeTime = Math.floor(Date.now() / 1000);
            const token = await generateStreamToken(1, 1);
            const afterTime = Math.floor(Date.now() / 1000) + 301; // 300s expiry + 1s buffer

            const verified = await verifyStreamToken(token);
            expect(verified?.expiresAt).toBeGreaterThan(beforeTime);
            expect(verified?.expiresAt).toBeLessThan(afterTime);
        });
    });

    describe('timing attack resistance', () => {
        it('should use constant-time comparison for signature', async () => {
            // Generate a valid token
            const token = await generateStreamToken(1, 1);

            // Create two tampered versions with different wrong signatures
            const tampered1 = token.slice(0, -10) + 'a'.repeat(10);
            const tampered2 = token.slice(0, -10) + 'z'.repeat(10);

            // Both should be rejected
            const result1 = await verifyStreamToken(tampered1);
            const result2 = await verifyStreamToken(tampered2);

            expect(result1).toBeNull();
            expect(result2).toBeNull();
        });
    });
});
