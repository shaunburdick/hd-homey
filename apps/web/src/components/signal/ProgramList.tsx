'use client';

/**
 * ProgramList — Collapsible listing of MPEG programs and PIDs on a tuned channel.
 *
 * @module components/signal/ProgramList
 */

import Link from 'next/link';
import type { ParsedProgram, StreamInfoPid } from '@/lib/hdhr/types';

interface ProgramListProps {
    programs: ParsedProgram[];
    idle: boolean;
    tunerId: number;
}

/** PID table row */
function PidRow({ pid }: { pid: StreamInfoPid }) {
    return (
        <tr>
            <td>{pid.pid}</td>
            <td>{pid.codec}</td>
            <td>{pid.type}</td>
        </tr>
    );
}

/** Single program entry with PID table */
function ProgramEntry({ program, tunerId }: { program: ParsedProgram; tunerId: number }) {
    return (
        <div className="program-entry">
            <div className="program-entry-header">
                <span className="program-entry-number">Program {program.programNumber}</span>
                {program.name !== '' && (
                    <span className="program-entry-name">{program.name}</span>
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
                            <PidRow key={`${pid.pid}-${pid.codec}`} pid={pid} />
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

/**
 * Collapsible program/PID listing for a tuned channel.
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
                {idle && <p className="program-list-empty">No channel tuned</p>}
                {!idle && programs.length === 0 && (
                    <p className="program-list-empty">No program data available</p>
                )}
                {!idle && programs.map((program) => (
                    <ProgramEntry key={program.programNumber} program={program} tunerId={tunerId} />
                ))}
            </div>
        </details>
    );
}
