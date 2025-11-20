/**
 * Error handling utilities for HD Homey
 * Provides user-friendly error messages and recovery suggestions
 */

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
 * Get user-friendly error info from an error object
 */
export function getErrorInfo(error: Error | string): ErrorInfo {
    // If it's a string, check if it matches a known error type
    if (typeof error === 'string') {
        return ERROR_MESSAGES[error] ?? ERROR_MESSAGES.SERVER_ERROR;
    }

    // Check error message for known patterns
    const message = error.message.toLowerCase();

    if (message.includes('unauthorized') ||
        message.includes('not authenticated')) {
        return ERROR_MESSAGES.UNAUTHORIZED;
    }
    if (message.includes('forbidden') ||
        message.includes('permission')) {
        return ERROR_MESSAGES.FORBIDDEN;
    }
    if (message.includes('not found')) {
        return ERROR_MESSAGES.NOT_FOUND;
    }
    if (message.includes('token') &&
        message.includes('expired')) {
        return ERROR_MESSAGES.STREAM_TOKEN_EXPIRED;
    }
    if (message.includes('token') &&
        message.includes('invalid')) {
        return ERROR_MESSAGES.STREAM_TOKEN_INVALID;
    }
    if (message.includes('inactive')) {
        return ERROR_MESSAGES.TUNER_INACTIVE;
    }
    if (message.includes('timeout') ||
        message.includes('timed out')) {
        return ERROR_MESSAGES.TIMEOUT;
    }
    if (message.includes('network') ||
        message.includes('econnrefused') ||
        message.includes('enotfound')) {
        return ERROR_MESSAGES.NETWORK_ERROR;
    }
    if (message.includes('database') ||
        message.includes('sqlite')) {
        return ERROR_MESSAGES.DATABASE_ERROR;
    }
    if (message.includes('transcode') ||
        message.includes('ffmpeg')) {
        return ERROR_MESSAGES.TRANSCODING_ERROR;
    }

    // Default to generic server error
    return ERROR_MESSAGES.SERVER_ERROR;
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
