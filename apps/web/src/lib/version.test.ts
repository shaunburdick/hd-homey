import { describe, it, expect } from 'vitest';
import type { BuildMetadata } from './version';
import {
    getVersion,
    getVersionMetadata,
    getFormattedVersion,
} from './version';

describe('version module', () => {
    describe('getVersionMetadata', () => {
        it('should return metadata from version.json', () => {
            const metadata = getVersionMetadata();

            expect(metadata).toHaveProperty('version');
            expect(metadata).toHaveProperty('commit');
            expect(metadata).toHaveProperty('branch');
            expect(metadata).toHaveProperty('buildDate');
            expect(metadata).toHaveProperty('environment');
            expect(typeof metadata.version).toBe('string');
            expect(typeof metadata.commit).toBe('string');
        });

        it('should match BuildMetadata interface structure', () => {
            const metadata = getVersionMetadata();

            // Verify all required fields exist
            const requiredFields: (keyof BuildMetadata)[] = [
                'version',
                'commit',
                'branch',
                'buildDate',
                'environment',
            ];

            for (const field of requiredFields) {
                expect(metadata).toHaveProperty(field);
            }

            // Verify environment is one of the valid values
            expect(['production', 'development']).toContain(metadata.environment);
        });

        it('should have valid buildDate in ISO 8601 format', () => {
            const metadata = getVersionMetadata();

            // Should be a valid ISO 8601 date
            expect(metadata.buildDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

            // Should be parseable as a date
            const date = new Date(metadata.buildDate);
            expect(date.toString()).not.toBe('Invalid Date');
        });
    });

    describe('getFormattedVersion', () => {
        it('should return formatted version with current build metadata', () => {
            const formatted = getFormattedVersion();

            // Should match pattern: VERSION (BRANCH@COMMIT) or VERSION (COMMIT)
            expect(formatted).toMatch(/^\d+\.\d+\.\d+[^ ]* \([^)]+\)$/);
            expect(formatted).toContain('(');
            expect(formatted).toContain(')');
        });

        it('should format correctly for feature branches', () => {
            const metadata = getVersionMetadata();
            const formatted = getFormattedVersion();

            // If we're on a feature branch (not main/master), should show branch@commit
            if (
                metadata.branch !== null &&
                metadata.branch !== 'main' &&
                metadata.branch !== 'master' &&
                metadata.environment === 'development'
            ) {
                expect(formatted).toContain('@');
                expect(formatted).toContain(metadata.branch);
            }

            // Should always contain the commit
            expect(formatted).toContain(metadata.commit);
        });

        it('should format correctly for main/master branches or production', () => {
            const metadata = getVersionMetadata();
            const formatted = getFormattedVersion();

            // If we're on main, master, or production, should not show branch@
            if (
                metadata.branch === 'main' ||
                metadata.branch === 'master' ||
                metadata.environment === 'production'
            ) {
                expect(formatted).not.toContain('@');
            }

            // Should always contain the commit
            expect(formatted).toContain(metadata.commit);
        });

        it('should include version from metadata', () => {
            const metadata = getVersionMetadata();
            const formatted = getFormattedVersion();

            expect(formatted).toContain(metadata.version);
        });
    });

    describe('getVersion (backward compatibility)', () => {
        it('should return only semantic version without commit info', () => {
            const version = getVersion();

            expect(version).toMatch(/^\d+\.\d+\.\d+/);
            expect(version).not.toContain('(');
            expect(version).not.toContain('@');
        });

        it('should return same version as metadata.version', () => {
            const metadata = getVersionMetadata();

            expect(getVersion()).toBe(metadata.version);
        });

        it('should not include dirty suffix or commit SHA', () => {
            const version = getVersion();

            expect(version).not.toContain('-dirty');
            expect(version).not.toContain('(');
        });
    });
});
