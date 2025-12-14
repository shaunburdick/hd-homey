import { describe, it, expect } from 'vitest';
import {
    ERROR_MESSAGES,
    getErrorInfo,
    isAuthError,
    isPermissionError,
    isNotFoundError
} from './errors';

describe('Error Handling', () => {
    describe('ERROR_MESSAGES', () => {
        it('should have all required error types', () => {
            expect(ERROR_MESSAGES.UNAUTHORIZED).toBeDefined();
            expect(ERROR_MESSAGES.FORBIDDEN).toBeDefined();
            expect(ERROR_MESSAGES.NOT_FOUND).toBeDefined();
            expect(ERROR_MESSAGES.SERVER_ERROR).toBeDefined();
        });

        it('should have title and message for each error', () => {
            for (const [key, info] of Object.entries(ERROR_MESSAGES)) {
                expect(info.title, `${key} should have title`).toBeTruthy();
                expect(info.message, `${key} should have message`).toBeTruthy();
            }
        });

        it('should have recovery steps for common errors', () => {
            expect(ERROR_MESSAGES.UNAUTHORIZED.recovery).toBeDefined();
            expect(ERROR_MESSAGES.FORBIDDEN.recovery).toBeDefined();
            expect(ERROR_MESSAGES.NOT_FOUND.recovery).toBeDefined();
            expect(ERROR_MESSAGES.SERVER_ERROR.recovery).toBeDefined();
        });
    });

    describe('getErrorInfo', () => {
        it('should return error info for known error type string', () => {
            const info = getErrorInfo('UNAUTHORIZED');
            expect(info.title).toBe('Authentication Required');
        });

        it('should detect unauthorized errors from message', () => {
            const error = new Error('User not authenticated');
            const info = getErrorInfo(error);
            expect(info.title).toBe('Authentication Required');
        });

        it('should detect forbidden errors from message', () => {
            const error = new Error('Forbidden: Admin access required');
            const info = getErrorInfo(error);
            expect(info.title).toBe('Access Denied');
        });

        it('should detect not found errors from message', () => {
            const error = new Error('Resource not found');
            const info = getErrorInfo(error);
            expect(info.title).toBe('Page Not Found');
        });

        it('should detect stream token expired errors', () => {
            const error = new Error('Token has expired');
            const info = getErrorInfo(error);
            expect(info.title).toBe('Stream Link Expired');
        });

        it('should detect invalid token errors', () => {
            const error = new Error('Invalid token signature');
            const info = getErrorInfo(error);
            expect(info.title).toBe('Invalid Stream Link');
        });

        it('should detect tuner inactive errors', () => {
            const error = new Error('Tuner is inactive');
            const info = getErrorInfo(error);
            expect(info.title).toBe('Tuner Unavailable');
        });

        it('should detect timeout errors', () => {
            const error = new Error('Request timed out');
            const info = getErrorInfo(error);
            expect(info.title).toBe('Request Timed Out');
        });

        it('should detect network errors', () => {
            const error = new Error('Network error: ECONNREFUSED');
            const info = getErrorInfo(error);
            expect(info.title).toBe('Network Error');
        });

        it('should detect database errors', () => {
            const error = new Error('Database connection failed');
            const info = getErrorInfo(error);
            expect(info.title).toBe('Database Error');
        });

        it('should detect transcoding errors', () => {
            const error = new Error('Ffmpeg transcoding failed');
            const info = getErrorInfo(error);
            expect(info.title).toBe('Transcoding Failed');
        });

        const genericTitle = 'Something Went Wrong';

        it('should return generic error for unknown errors', () => {
            const error = new Error('Some random error');
            const info = getErrorInfo(error);
            expect(info.title).toBe(genericTitle);
        });

        it('should handle non-Error objects', () => {
            const info = getErrorInfo('UNKNOWN_ERROR_TYPE');
            expect(info.title).toBe(genericTitle);
        });
    });

    const serverErrorMsg = 'Server error';

    describe('isAuthError', () => {
        it('should identify unauthorized errors', () => {
            expect(isAuthError(new Error('Unauthorized'))).toBe(true);
            expect(isAuthError(new Error('User not authenticated'))).toBe(true);
        });

        it('should identify session expired errors', () => {
            expect(isAuthError(new Error('Session expired'))).toBe(true);
        });

        it('should not identify non-auth errors', () => {
            expect(isAuthError(new Error('Not found'))).toBe(false);
            expect(isAuthError(new Error(serverErrorMsg))).toBe(false);
        });
    });

    describe('isPermissionError', () => {
        it('should identify forbidden errors', () => {
            expect(isPermissionError(new Error('Forbidden'))).toBe(true);
            expect(isPermissionError(new Error('Permission denied'))).toBe(true);
        });

        it('should identify not allowed errors', () => {
            expect(isPermissionError(new Error('Action not allowed'))).toBe(true);
        });

        it('should not identify non-permission errors', () => {
            expect(isPermissionError(new Error('Not found'))).toBe(false);
            expect(isPermissionError(new Error(serverErrorMsg))).toBe(false);
        });
    });

    describe('isNotFoundError', () => {
        it('should identify not found errors', () => {
            expect(isNotFoundError(new Error('Not found'))).toBe(true);
            expect(isNotFoundError(new Error('Resource does not exist'))).toBe(true);
        });

        it('should not identify other errors', () => {
            expect(isNotFoundError(new Error('Forbidden'))).toBe(false);
            expect(isNotFoundError(new Error(serverErrorMsg))).toBe(false);
        });
    });
});
