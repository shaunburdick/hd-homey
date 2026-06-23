'use client';

/**
 * ProgramList — Compact inline listing of MPEG programs on a tuned channel.
 *
 * Renders programs as a flow-wrapped inline list: "Programs: 15.1 WKOFCBS · 5.2 Charge!"
 * Returns null when the tuner is idle or no program data is available.
 *
 * @module components/signal/ProgramList
 */

import React from 'react';
import type { ParsedProgram } from '@/lib/hdhr/types';

interface ProgramListProps {
    programs: ParsedProgram[];
    idle: boolean;
}

/**
 * Compact inline program listing for a tuned channel.
 *
 * Programs are separated by a middle-dot (·) separator and wrap naturally
 * when the card is narrow. The raw program number is shown on hover via the
 * `title` attribute. Returns null when idle or when no programs are available.
 *
 * @param props - Program list props
 */
export function ProgramList({ programs, idle }: ProgramListProps) {
    if (idle || programs.length === 0) {
        return null;
    }

    return (
        <div className="program-list">
            <span className="program-list-label">Programs:</span>
            <span className="program-list-items">
                {programs.map((program, i) => (
                    <React.Fragment key={program.programNumber}>
                        {i > 0 && <span className="program-list-sep"> · </span>}
                        <span className="program-list-item" title={`Program ${program.programNumber}`}>
                            {program.guideNumber ?? program.programNumber}
                            {program.name !== '' && ` ${program.name}`}
                        </span>
                    </React.Fragment>
                ))}
            </span>
        </div>
    );
}
