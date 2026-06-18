import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteTuner } from './actions';

// Mock dependencies
vi.mock('@/lib/auth/helpers', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual as object,
        requireAdmin: vi.fn()
    };
});

vi.mock('@/lib/database/db', () => ({
    getDb: vi.fn(),
    connection: vi.fn(() => ({}))
}));

vi.mock('@/lib/logger', () => ({
    default: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn()
    }
}));

// Mock Next.js functions
const REDIRECT_ERROR_CODE = 'NEXT_REDIRECT';
vi.mock('next/navigation', () => ({
    redirect: vi.fn((url: string) => {
        const error = new Error(`${REDIRECT_ERROR_CODE}: ${url}`) as Error & { digest: string };
        error.digest = REDIRECT_ERROR_CODE;
        throw error;
    })
}));

vi.mock('next/dist/client/components/redirect-error', () => ({
    isRedirectError: vi.fn((error: unknown) => {
        return (error as { digest?: string } | null)?.digest === REDIRECT_ERROR_CODE;
    })
}));

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn()
}));

describe('deleteTuner', () => {
    let mockDb: {
        update: ReturnType<typeof vi.fn>;
    };
    let mockUpdate: ReturnType<typeof vi.fn>;
    let mockSet: ReturnType<typeof vi.fn>;
    let mockWhere: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        vi.clearAllMocks();

        // Setup mock database chain
        mockWhere = vi.fn().mockResolvedValue(null);
        mockSet = vi.fn().mockReturnValue({ where: mockWhere });
        mockUpdate = vi.fn().mockReturnValue({ set: mockSet });

        mockDb = {
            update: mockUpdate
        };

        const { getDb } = vi.mocked(await import('@/lib/database/db'));
        getDb.mockResolvedValue(mockDb as never);

        const { requireAdmin } = vi.mocked(await import('@/lib/auth/helpers'));
        requireAdmin.mockResolvedValue({} as never);
    });

    it('should soft delete tuner and its channels', async () => {
        const formData = new FormData();
        formData.append('id', '1');

        try {
            await deleteTuner(null, formData);
        } catch (error) {
            // Expected redirect error
            expect((error as Error).message).toContain('NEXT_REDIRECT');
        }

        // Verify tuner was updated (soft deleted)
        expect(mockUpdate).toHaveBeenCalledTimes(2);
        expect(mockSet).toHaveBeenCalledTimes(2);

        // Check tuner update call
        const tunerUpdateCall = mockSet.mock.calls[0][0];
        expect(tunerUpdateCall).toHaveProperty('deleted_at');
        expect(tunerUpdateCall).toHaveProperty('modified_at');
        expect(tunerUpdateCall.deleted_at).toBeInstanceOf(Date);
        expect(tunerUpdateCall.modified_at).toBeInstanceOf(Date);

        // Check channels update call
        const channelsUpdateCall = mockSet.mock.calls[1][0];
        expect(channelsUpdateCall).toHaveProperty('deleted_at');
        expect(channelsUpdateCall).toHaveProperty('modified_at');
        expect(channelsUpdateCall).toHaveProperty('is_active', false);
        expect(channelsUpdateCall.deleted_at).toBeInstanceOf(Date);
        expect(channelsUpdateCall.modified_at).toBeInstanceOf(Date);

        // Verify both updates used same timestamp
        expect(tunerUpdateCall.deleted_at).toEqual(channelsUpdateCall.deleted_at);
    });

    it('should return error for invalid tuner ID', async () => {
        const formData = new FormData();
        formData.append('id', 'invalid');

        const result = await deleteTuner(null, formData);

        expect(result).toEqual([
            { path: 'id', message: 'Invalid tuner ID' }
        ]);
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should return error for zero tuner ID', async () => {
        const formData = new FormData();
        formData.append('id', '0');

        const result = await deleteTuner(null, formData);

        expect(result).toEqual([
            { path: 'id', message: 'Invalid tuner ID' }
        ]);
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should return error when not authorized', async () => {
        const { requireAdmin } = vi.mocked(await import('@/lib/auth/helpers'));
        requireAdmin.mockRejectedValue(new Error('Unauthorized'));

        const formData = new FormData();
        formData.append('id', '1');

        const result = await deleteTuner(null, formData);

        expect(result).toEqual([
            { path: 'authorization', message: 'Unauthorized' }
        ]);
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should revalidate path after deletion', async () => {
        const { revalidatePath } = vi.mocked(await import('next/cache'));
        const formData = new FormData();
        formData.append('id', '1');

        try {
            await deleteTuner(null, formData);
        } catch (error) {
            // Expected redirect error thrown by Next.js - not a real error condition
            if (!(error instanceof Error && error.message.includes('NEXT_REDIRECT'))) {
                throw error;
            }
        }

        expect(revalidatePath).toHaveBeenCalledWith('/tuners');
    });

    it('should redirect to tuners list after deletion', async () => {
        const { redirect } = vi.mocked(await import('next/navigation'));
        const formData = new FormData();
        formData.append('id', '1');

        try {
            await deleteTuner(null, formData);
        } catch (error) {
            // Expected redirect error thrown by Next.js - not a real error condition
            if (!(error instanceof Error && error.message.includes('NEXT_REDIRECT'))) {
                throw error;
            }
        }

        expect(redirect).toHaveBeenCalledWith('/tuners');
    });

    it('should log deletion with tuner ID', async () => {
        const loggerModule = await import('@/lib/logger');
        const Logger = loggerModule.default;
        const formData = new FormData();
        formData.append('id', '1');

        try {
            await deleteTuner(null, formData);
        } catch (error) {
            // Expected redirect error thrown by Next.js - not a real error condition
            if (!(error instanceof Error && error.message.includes('NEXT_REDIRECT'))) {
                throw error;
            }
        }

        expect(Logger.info).toHaveBeenCalledWith(
            { tunerId: 1 },
            'Tuner and its channels soft deleted'
        );
    });
});
