export async function register() {
    // Skip instrumentation during build or if database doesn't exist
    // This prevents build failures in CI/CD environments
    if (process.env.SKIP_INSTRUMENTATION === 'true') {
        return;
    }

    if (process.env.NEXT_RUNTIME === 'nodejs') {
        try {
            await (await import('./instrumentation-node')).run();
        } catch (error) {
            // Silently fail during build if database doesn't exist
            if (error instanceof Error && error.message.includes('directory does not exist')) {
                // Database doesn't exist - skip instrumentation (build time)
                return;
            }
            throw error;
        }
    }
}
