import type { ChannelInfo } from '@/lib/hdhr/types';

/**
 * Mock HDHomeRun lineup data based on real device responses
 */
export const mockLineupData: ChannelInfo[] = [
    {
        GuideNumber: '3.1',
        GuideName: 'WSTMNBC',
        VideoCodec: 'MPEG2',
        AudioCodec: 'AC3',
        HD: 1,
        URL: 'http://192.168.20.25:5004/auto/v3.1'
    },
    {
        GuideNumber: '3.2',
        GuideName: 'CW6',
        VideoCodec: 'MPEG2',
        AudioCodec: 'AC3',
        HD: 1,
        URL: 'http://192.168.20.25:5004/auto/v3.2'
    },
    {
        GuideNumber: '3.3',
        GuideName: 'Comet',
        VideoCodec: 'MPEG2',
        AudioCodec: 'AC3',
        URL: 'http://192.168.20.25:5004/auto/v3.3'
    },
    {
        GuideNumber: '5.1',
        GuideName: 'WTVHCBS',
        VideoCodec: 'MPEG2',
        AudioCodec: 'AC3',
        HD: 1,
        URL: 'http://192.168.20.25:5004/auto/v5.1'
    },
    {
        GuideNumber: '5.2',
        GuideName: 'Charge!',
        VideoCodec: 'MPEG2',
        AudioCodec: 'AC3',
        URL: 'http://192.168.20.25:5004/auto/v5.2'
    },
    {
        GuideNumber: '9.1',
        GuideName: 'WSYRABC',
        VideoCodec: 'H264',
        AudioCodec: 'AAC',
        HD: 1,
        URL: 'http://192.168.20.25:5004/auto/v9.1'
    }
];

/**
 * Mock HDHomeRun device discovery info
 */
export const mockDeviceInfo = {
    FriendlyName: 'HDHomeRun FLEX 4K',
    ModelNumber: 'HDFX-4K',
    FirmwareName: 'hdhomerun_dvr_atsc3',
    FirmwareVersion: '20250815',
    DeviceID: '10A9F9FD',
    DeviceAuth: 'test-auth-token',
    BaseURL: 'http://192.168.20.25',
    LineupURL: 'http://192.168.20.25/lineup.json',
    TunerCount: 4
};

/**
 * Create a minimal lineup for testing
 */
export function createMockLineup(count = 3): ChannelInfo[] {
    return mockLineupData.slice(0, count);
}

/**
 * Create a custom channel for testing
 */
export function createMockChannel(overrides: Partial<ChannelInfo> = {}): ChannelInfo {
    return {
        GuideNumber: '1.1',
        GuideName: 'Test Channel',
        VideoCodec: 'H264',
        AudioCodec: 'AAC',
        HD: 1,
        URL: 'http://192.168.20.25:5004/auto/v1.1',
        ...overrides
    };
}
