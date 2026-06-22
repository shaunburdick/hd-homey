/**
 * Tests for TuningControl component.
 *
 * Verifies role-based rendering, loading/empty states, and current-channel badge.
 * Uses vi.mock to control useSession behavior per test.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { TuningControl } from './TuningControl';
import { AuthRoles } from '@/lib/auth-roles';

// =============================================================================
// Mocks
// =============================================================================

vi.mock('@/lib/auth/auth-client', () => ({
    useSession: vi.fn(),
}));

// =============================================================================
// Imports after mocks
// =============================================================================

import { useSession } from '@/lib/auth/auth-client';

// =============================================================================
// Helpers
// =============================================================================

type MockedFn = ReturnType<typeof vi.fn>;

function getMockUseSession(): MockedFn {
    return useSession as unknown as MockedFn;
}

interface ChannelEntry {
    guideNumber: string;
    guideName: string;
}

/** Set up a global fetch mock that returns the given channels */
function mockFetchChannels(channels: ChannelEntry[]) {
    global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: channels }),
    } as Response);
}

const MOCK_CHANNELS: ChannelEntry[] = [
    { guideNumber: '5.1', guideName: 'KPIX HD' },
    { guideNumber: '7.1', guideName: 'KGO HD' },
];

const BASE_PROPS = {
    tunerId: 1,
    resource: 'tuner0',
    idle: true,
};

// =============================================================================
// Tests
// =============================================================================

describe('TuningControl', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    // -------------------------------------------------------------------------
    // Role-based rendering
    // -------------------------------------------------------------------------

    it('renders nothing (null) for viewer users', () => {
        getMockUseSession().mockReturnValue({
            data: { user: { id: 'u1', role: AuthRoles.Viewer } },
        });
        mockFetchChannels(MOCK_CHANNELS);

        const { container } = render(<TuningControl {...BASE_PROPS} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders nothing (null) when session is null', () => {
        getMockUseSession().mockReturnValue({ data: null });
        mockFetchChannels(MOCK_CHANNELS);

        const { container } = render(<TuningControl {...BASE_PROPS} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders channel dropdown for admin users', async () => {
        getMockUseSession().mockReturnValue({
            data: { user: { id: 'u1', role: AuthRoles.Admin } },
        });
        mockFetchChannels(MOCK_CHANNELS);

        render(<TuningControl {...BASE_PROPS} />);

        await waitFor(() => {
            expect(screen.getByRole('combobox')).toBeTruthy();
        });

        const options = screen.getAllByRole('option');
        // Channels 5.1 and 7.1
        expect(options.length).toBe(2);
        expect(options[0].textContent).toContain('5.1');
        expect(options[1].textContent).toContain('7.1');
    });

    it('renders Tune and Clear buttons for admin users', async () => {
        getMockUseSession().mockReturnValue({
            data: { user: { id: 'u1', role: AuthRoles.Admin } },
        });
        mockFetchChannels(MOCK_CHANNELS);

        render(<TuningControl {...BASE_PROPS} />);

        await waitFor(() => {
            const tuneButtons = screen.getAllByRole('button', { name: /tune tuner0 to selected channel/i });
            expect(tuneButtons.length).toBeGreaterThan(0);
            expect(screen.getAllByRole('button', { name: /clear tuner0/i }).length).toBeGreaterThan(0);
        });
    });

    // -------------------------------------------------------------------------
    // Empty lineup state
    // -------------------------------------------------------------------------

    it('shows "No channels available" when lineup is empty', async () => {
        getMockUseSession().mockReturnValue({
            data: { user: { id: 'u1', role: AuthRoles.Admin } },
        });
        mockFetchChannels([]);

        render(<TuningControl {...BASE_PROPS} />);

        await waitFor(() => {
            const emptyOptions = screen.getAllByRole('option').filter(
                (opt) => opt.textContent?.includes('No channels available'),
            );
            expect(emptyOptions.length).toBeGreaterThan(0);
        });
    });

    it('disables the dropdown when lineup is empty', async () => {
        getMockUseSession().mockReturnValue({
            data: { user: { id: 'u1', role: AuthRoles.Admin } },
        });
        mockFetchChannels([]);

        render(<TuningControl {...BASE_PROPS} />);

        await waitFor(() => {
            const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
            expect(selects.every((select) => select.disabled)).toBe(true);
        });
    });

    // -------------------------------------------------------------------------
    // Current channel badge
    // -------------------------------------------------------------------------

    it('shows current channel badge when slot is locked', async () => {
        getMockUseSession().mockReturnValue({
            data: { user: { id: 'u1', role: AuthRoles.Admin } },
        });
        mockFetchChannels(MOCK_CHANNELS);

        render(
            <TuningControl
                tunerId={1}
                resource="tuner0"
                idle={false}
                vctNumber="5.1"
                vctName="KPIX HD"
            />,
        );

        await waitFor(() => {
            expect(screen.getByText('5.1 KPIX HD')).toBeTruthy();
        });
    });

    it('does not show channel badge when slot is idle', async () => {
        getMockUseSession().mockReturnValue({
            data: { user: { id: 'u1', role: AuthRoles.Admin } },
        });
        mockFetchChannels(MOCK_CHANNELS);

        render(
            <TuningControl
                tunerId={1}
                resource="tuner0"
                idle={true}
                vctNumber="5.1"
                vctName="KPIX HD"
            />,
        );

        await waitFor(() => {
            // Controls should render
            expect(screen.getAllByRole('combobox').length).toBeGreaterThan(0);
        });

        expect(screen.queryByText('5.1 KPIX HD')).toBeNull();
    });
});
