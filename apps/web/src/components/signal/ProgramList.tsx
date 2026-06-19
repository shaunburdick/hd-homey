'use client';

/**
 * ProgramList — Collapsible listing of MPEG programs and PIDs on a tuned channel.
 *
 * Shows program numbers, names, and PID tables with a "Watch" link per program.
 * P2 feature: displayed only on the single-tuner signal page.
 *
 * @module components/signal/ProgramList
 */

import Link from 'next/link';
import type { ParsedProgram } from '@/lib/hdhr/types';

// =============================================================================
// Component
// =============================================================================

interface ProgramListProps {
    /** Parsed programs from the streaminfo SSE event */
    programs: ParsedProgram[];
    /** True when the tuner has no channel tuned */
    idle: boolean;
    /** HD Homey database tuner ID — used to construct Watch links */
    tunerId: number;
}

/**
 * Collapsible program/PID listing for a tuned channel.
 *
 * Renders:
 * - "No channel tuned" when idle
 * - "No program data available" when programs array is empty but tuner is active
 * - Program table with PID details and Watch links when programs are present
 *
 * @param props - Program list props
 */
export function ProgramList({ programs, idle, tunerId }: ProgramListProps) {
    return (
        <details className="program-list">
            <summary className="program-list-summary">
                Programs on this channel
                {!idle && programs.length > 0 && (
                    <span className="program-list-count"> ({programs.length})</span>
                )}
            </summary>

            <div className="program-list-content">
                {idle && (
                    <p className="program-list-empty">No channel tuned</p>
                )}

                {!idle && programs.length === 0 && (
                    <p className="program-list-empty">No program data available</p>
                )}

                {!idle && programs.length > 0 && programs.map((program) => (
                    <div key={program.programNumber} className="program-entry">
                        <div className="program-entry-header">
                            <span className="program-entry-number">
                                Program {program.programNumber}
                            </span>
                            {program.name && (
                                <span className="program-entry-name">
                                    {program.name}
                                </span>
                            )}
                            <Link
                                href={`/tuners/${tunerId}/channel/${program.programNumber}/watch`}
                                className="program-entry-watch-link"
                            >
                                Watch
                            </Link>
                        </div>

                        {program.pids.length > 0 && (
                            <table className="program-pid-table">
                                <thead>
                                    <tr>
                                        <th>PID</th>
                                        <th>Codec</th>
                                        <th>Type</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {program.pids.map((pid) => (
                                        <tr key={`${pid.pid}-${pid.codec}`}>
                                            <td>{pid.pid}</td>
                                            <td>{pid.codec}</td>
                                            <td>{pid.type}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                ))}
            </div>
        </details>
    );
}
