/**
 * Error handling utilities for HD Homey
 * Provides user-friendly error messages and recovery suggestions
 */

/**
 * A single validation error with the field path and message
 */
export interface ValidationError {
    path: string;
    message: string;
}

/**
 * Form action state returned by server actions to client components
 * Includes per-field error messages and an optional success indicator
 */
export interface FormState {
    errors: Record<string, string[]>;
    success?: boolean;
}

/**
 * Build a field → messages map from an array of validation errors
 *
 * @param errors - Array of validation error objects
 * @returns Record mapping field names to arrays of error messages
 */
export function buildErrorMap(errors: ValidationError[]): Record<string, string[]> {
    return errors.reduce((acc: Record<string, string[]>, err: ValidationError) => {
        acc[err.path] ??= [];
        acc[err.path].push(err.message);
        return acc;
    }, {});
}

/**
 * Build a field → messages map from raw unknown state.
 * Safely handles non-array payloads (e.g. when the action returns an empty state).
 *
 * @param state - Raw action state, expected to be an array of ValidationError
 * @returns Field map or undefined if state is not an array of ValidationErrors
 */
export function buildFieldErrors(state: unknown): Record<string, string[]> | undefined {
    if (state === null || state === undefined || !Array.isArray(state)) {
        return undefined;
    }
    return state.reduce((acc: Record<string, string[]>, err: ValidationError) => {
        acc[err.path] ??= [];
        acc[err.path].push(err.message);
        return acc;
    }, {});
}

export interface ErrorInfo {
    title: string;
    message: string;
    suggestion?: string;
    recovery?: string[];
}

/**
 * Map of common error types to user-friendly messages
 */
export const ERROR_MESSAGES: Record<string, ErrorInfo> = {
    // Authentication errors
    UNAUTHORIZED: {
        title: 'Authentication Required',
        message: 'You need to sign in to access this page.',
        recovery: [
            'Sign in with your username and password',
            'Contact an administrator if you forgot your password'
        ]
    },
    FORBIDDEN: {
        title: 'Access Denied',
        message: 'You don\'t have permission to access this resource.',
        suggestion: 'This action requires administrator privileges.',
        recovery: [
            'Contact an administrator to request access',
            'Sign in with an account that has the necessary permissions'
        ]
    },
    SESSION_EXPIRED: {
        title: 'Session Expired',
        message: 'Your session has expired. Please sign in again.',
        recovery: [
            'Sign in again to continue',
            'Your data has been preserved and you can pick up where you left off'
        ]
    },

    // Stream errors
    STREAM_TOKEN_EXPIRED: {
        title: 'Stream Link Expired',
        message: 'This stream link has expired for security reasons.',
        suggestion: 'Stream links are valid for 12 hours.',
        recovery: [
            'Go back to the channel page to get a fresh stream link',
            'Bookmark the channel page, not the stream URL'
        ]
    },
    STREAM_TOKEN_INVALID: {
        title: 'Invalid Stream Link',
        message: 'This stream link is invalid or has been tampered with.',
        recovery: [
            'Go back to the channel page to get a valid stream link',
            'Make sure you copied the entire URL'
        ]
    },
    TUNER_INACTIVE: {
        title: 'Tuner Unavailable',
        message: 'This tuner is currently inactive and cannot be streamed.',
        suggestion: 'The administrator may have disabled this tuner.',
        recovery: [
            'Contact an administrator to activate the tuner',
            'Try a different channel from an active tuner'
        ]
    },
    TUNER_UNREACHABLE: {
        title: 'Tuner Connection Failed',
        message: 'Unable to connect to the HDHomeRun device.',
        suggestion: 'The device may be offline or unreachable on the network.',
        recovery: [
            'Check that the tuner is powered on',
            'Verify network connectivity',
            'Contact an administrator for assistance'
        ]
    },

    // Resource errors
    NOT_FOUND: {
        title: 'Page Not Found',
        message: 'The page you\'re looking for doesn\'t exist or has been moved.',
        recovery: ['Check the URL for typos', 'Go back to the home page', 'Browse available tuners']
    },
    CHANNEL_NOT_FOUND: {
        title: 'Channel Not Found',
        message: 'This channel no longer exists or has been removed.',
        suggestion: 'The channel may have been removed during a lineup update.',
        recovery: [
            'Browse other channels from this tuner',
            'Refresh the channel lineup',
            'Contact an administrator'
        ]
    },

    // Form errors
    VALIDATION_ERROR: {
        title: 'Invalid Input',
        message: 'Some of the information you entered is invalid.',
        recovery: [
            'Check the highlighted fields for errors',
            'Make sure all required fields are filled in',
            'Contact support if you need help'
        ]
    },

    // Server errors
    SERVER_ERROR: {
        title: 'Something Went Wrong',
        message: 'We encountered an unexpected error. This has been logged.',
        recovery: [
            'Try refreshing the page',
            'Go back and try again',
            'Contact an administrator if the problem persists'
        ]
    },
    DATABASE_ERROR: {
        title: 'Database Error',
        message: 'Unable to access the database.',
        suggestion: 'This is usually temporary.',
        recovery: [
            'Wait a moment and try again',
            'Contact an administrator if the error persists'
        ]
    },
    TRANSCODING_ERROR: {
        title: 'Transcoding Failed',
        message: 'Unable to transcode this stream.',
        suggestion: 'The system may be overloaded or ffmpeg is not available.',
        recovery: [
            'Try the direct stream URL instead',
            'Wait a moment and try again',
            'Contact an administrator'
        ]
    },

    // Network errors
    NETWORK_ERROR: {
        title: 'Network Error',
        message: 'Unable to complete the request due to a network issue.',
        recovery: [
            'Check your internet connection',
            'Try again in a moment',
            'Contact support if the problem persists'
        ]
    },
    TIMEOUT: {
        title: 'Request Timed Out',
        message: 'The request took too long to complete.',
        recovery: [
            'Try again',
            'Check your network connection',
            'Contact an administrator if this happens frequently'
        ]
    }
};

/**
 * Pattern-to-error-key mapping for common error messages
 */
const ERROR_PATTERN_MAP: { patterns: string[]; key: string }[] = [
    { patterns: ['unauthorized', 'not authenticated'], key: 'UNAUTHORIZED' },
    { patterns: ['forbidden', 'permission'], key: 'FORBIDDEN' },
    { patterns: ['not found'], key: 'NOT_FOUND' },
    { patterns: ['inactive'], key: 'TUNER_INACTIVE' },
    { patterns: ['timeout', 'timed out'], key: 'TIMEOUT' },
    { patterns: ['network', 'econnrefused', 'enotfound'], key: 'NETWORK_ERROR' },
    { patterns: ['database', 'sqlite'], key: 'DATABASE_ERROR' },
    { patterns: ['transcode', 'ffmpeg'], key: 'TRANSCODING_ERROR' },
];

/**
 * Map an error message string to a known ErrorInfo entry
 */
function getErrorInfoFromMessage(rawMessage: string): ErrorInfo {
    const message = rawMessage.toLowerCase();

    // Token errors require two-pattern matching
    if (message.includes('token') && message.includes('expired')) {
        return ERROR_MESSAGES.STREAM_TOKEN_EXPIRED;
    }
    if (message.includes('token') && message.includes('invalid')) {
        return ERROR_MESSAGES.STREAM_TOKEN_INVALID;
    }

    for (const { patterns, key } of ERROR_PATTERN_MAP) {
        if (patterns.some(pattern => message.includes(pattern))) {
            return ERROR_MESSAGES[key] ?? ERROR_MESSAGES.SERVER_ERROR;
        }
    }

    return ERROR_MESSAGES.SERVER_ERROR;
}

/**
 * Get user-friendly error info from an error object
 */
export function getErrorInfo(error: Error | string): ErrorInfo {
    // If it's a string, check if it matches a known error type
    if (typeof error === 'string') {
        return ERROR_MESSAGES[error] ?? ERROR_MESSAGES.SERVER_ERROR;
    }

    return getErrorInfoFromMessage(error.message);
}

/**
 * Check if an error is an authentication error
 */
export function isAuthError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('unauthorized') ||
           message.includes('not authenticated') ||
           message.includes('session expired');
}

/**
 * Check if an error is a permission error
 */
export function isPermissionError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('forbidden') ||
           message.includes('permission') ||
           message.includes('not allowed');
}

/**
 * Check if an error is a not found error
 */
export function isNotFoundError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('not found') ||
           message.includes('does not exist');
}
