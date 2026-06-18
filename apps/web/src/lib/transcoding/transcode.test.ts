import { EventEmitter } from 'node:events';
import type { ChildProcess } from 'node:child_process';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { stopTranscode } from './transcode';

// Mock logger
vi.mock('@/lib/logger', () => ({
    default: {
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock child process
class MockChildProcess extends EventEmitter {
    public pid: number | undefined = 12345;
    public exitCode: number | null = null;
    public killed = false;
    public stdout = new EventEmitter();
    public stderr = new EventEmitter();

    public kill(signal?: NodeJS.Signals | number): boolean {
        this.killed = true;
        // Simulate async exit
        setImmediate(() => {
            this.exitCode = 0;
            this.emit('exit', 0, signal);
        });
        return true;
    }
}

describe('transcode module - race condition fix', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('stopTranscode', () => {
        it('should wait for process to exit before resolving', async () => {
            const mockProcess = new MockChildProcess();
            let processExited = false;

            // Override kill to track when process exits
            const originalKill = mockProcess.kill.bind(mockProcess);
            mockProcess.kill = vi.fn((signal?: NodeJS.Signals | number): boolean => {
                const result = originalKill(signal);
                // Set flag when exit event fires
                mockProcess.once('exit', () => {
                    processExited = true;
                });
                return result;
            });

            // Start the stop operation
            const stopPromise = stopTranscode(mockProcess as unknown as ChildProcess);

            // Exit should not have fired yet (still pending)
            expect(processExited).toBe(false);

            // Wait for stop to complete
            await stopPromise;

            // Now exit should have been called
            expect(processExited).toBe(true);
            expect(mockProcess.killed).toBe(true);
        });

        it('should not resolve until process actually exits (race condition fix)', async () => {
            const mockProcess = new MockChildProcess();
            let processExited = false;

            // Override kill to simulate delayed exit (like FFmpeg writing final segments)
            mockProcess.kill = vi.fn((signal?: NodeJS.Signals | number): boolean => {
                mockProcess.killed = true;
                // Simulate FFmpeg taking time to exit
                setTimeout(() => {
                    processExited = true;
                    mockProcess.exitCode = 0;
                    mockProcess.emit('exit', 0, signal);
                }, 50);
                return true;
            });

            const stopPromise = stopTranscode(mockProcess as unknown as ChildProcess);

            // Immediately after calling stopTranscode, process should not have exited yet
            expect(processExited).toBe(false);

            // Wait for the promise to resolve
            await stopPromise;

            // NOW the process should have exited
            expect(processExited).toBe(true);
        });

        it('should handle process that is already dead', async () => {
            const mockProcess = new MockChildProcess();
            mockProcess.exitCode = 0; // Already exited
            mockProcess.killed = true;

            // Should resolve immediately without calling kill
            await expect(stopTranscode(mockProcess as unknown as ChildProcess)).resolves.toBeUndefined();
        });

        it('should handle process with no PID', async () => {
            const mockProcess = new MockChildProcess();
            mockProcess.pid = undefined;

            // Should resolve immediately without error
            await expect(stopTranscode(mockProcess as unknown as ChildProcess)).resolves.toBeUndefined();
        });

        it('should handle process with invalid PID', async () => {
            const mockProcess = new MockChildProcess();
            mockProcess.pid = 0;

            await expect(stopTranscode(mockProcess as unknown as ChildProcess)).resolves.toBeUndefined();
        });

        it('should handle error when killing process', async () => {
            const mockProcess = new MockChildProcess();

            // Make kill throw an error (process already gone)
            mockProcess.kill = vi.fn(() => {
                throw new Error('ESRCH: No such process');
            });

            // Should handle the error gracefully and resolve
            await expect(stopTranscode(mockProcess as unknown as ChildProcess)).resolves.toBeUndefined();
        });

        it('should remove existing exit listeners to prevent duplicates', async () => {
            const mockProcess = new MockChildProcess();
            const listener1 = vi.fn();
            const listener2 = vi.fn();

            // Add some existing listeners
            mockProcess.on('exit', listener1);
            mockProcess.on('exit', listener2);

            await stopTranscode(mockProcess as unknown as ChildProcess);

            // The old listeners should have been removed (they shouldn't fire)
            expect(listener1).not.toHaveBeenCalled();
            expect(listener2).not.toHaveBeenCalled();
        });

        it('should send SIGKILL after timeout if process does not exit', async () => {
            const mockProcess = new MockChildProcess();
            let killCount = 0;

            // Override kill to not trigger exit on SIGTERM
            mockProcess.kill = vi.fn((signal?: NodeJS.Signals | number): boolean => {
                killCount++;
                mockProcess.killed = true;

                // Only exit on SIGKILL (second call)
                if (signal === 'SIGKILL') {
                    setImmediate(() => {
                        mockProcess.exitCode = 137;
                        mockProcess.emit('exit', 137, signal);
                    });
                }
                return true;
            });

            const stopPromise = stopTranscode(mockProcess as unknown as ChildProcess);

            // Wait for the full process to complete (including the 5s timeout)
            await stopPromise;

            // Should have been killed twice (SIGTERM, then SIGKILL after timeout)
            expect(killCount).toBe(2);
            // Access mock.calls directly to avoid unbound-method lint issues with class methods
            const killCalls = vi.mocked(mockProcess).kill.mock.calls;
            expect(killCalls.some(callArgs => callArgs[0] === 'SIGTERM')).toBe(true);
            expect(killCalls.some(callArgs => callArgs[0] === 'SIGKILL')).toBe(true);
        }, 10000); // 10 second timeout for this test
    });

    describe('race condition scenario', () => {
        it('prevents cleanup from deleting files while FFmpeg is still writing', async () => {
            const mockProcess = new MockChildProcess();
            let filesStillBeingWritten = true;

            // Simulate FFmpeg writing segments during shutdown
            mockProcess.kill = vi.fn((signal?: NodeJS.Signals | number): boolean => {
                mockProcess.killed = true;

                // Simulate FFmpeg taking time to finish writing segments
                setTimeout(() => {
                    filesStillBeingWritten = false;
                    mockProcess.exitCode = 0;
                    mockProcess.emit('exit', 0, signal);
                }, 100);

                return true;
            });

            // Call stopTranscode
            const stopPromise = stopTranscode(mockProcess as unknown as ChildProcess);

            // Files should still be getting written
            expect(filesStillBeingWritten).toBe(true);

            // Wait for stop to complete
            await stopPromise;

            // Now files should be done
            expect(filesStillBeingWritten).toBe(false);

            // At this point, it's safe to cleanup files because:
            // 1. stopTranscode has waited for the process to exit
            // 2. The process emitted the 'exit' event
            // 3. cleanupTranscodeFiles adds an additional 100ms delay for safety
        });
    });
});
