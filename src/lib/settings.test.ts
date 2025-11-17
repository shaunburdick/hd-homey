import { describe, it, expect } from 'vitest';
import { generateStreamSecret } from './settings';

describe('Settings', () => {
    describe('generateStreamSecret', () => {
        it('should generate a 64-character hex string', () => {
            const secret = generateStreamSecret();
            expect(secret).toHaveLength(64);
            expect(secret).toMatch(/^[a-f0-9]{64}$/);
        });

        it('should generate unique secrets', () => {
            const secret1 = generateStreamSecret();
            const secret2 = generateStreamSecret();
            expect(secret1).not.toEqual(secret2);
        });

        it('should generate cryptographically random secrets', () => {
            // Generate multiple secrets and check they're all different
            const secrets = new Set();
            for (let i = 0; i < 10; i++) {
                secrets.add(generateStreamSecret());
            }
            expect(secrets.size).toBe(10);
        });
    });
});
