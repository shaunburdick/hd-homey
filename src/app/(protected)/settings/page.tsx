import { cpus } from 'os';
import Link from 'next/link';
import RoleGuard from '@/components/RoleGuard';
import { AuthRoles } from '@/lib/auth-roles';
import { getStreamSecretInfo, regenerateAppStreamSecret } from '@/lib/actions/settings';
import StreamSecretManager from '@/components/stream-secret-manager';
import TranscodingSettings from '@/components/transcoding-settings';
import TranscodingStatus from '@/components/transcoding-status';
import { getTranscodingSettings } from '@/lib/settings';
import { detectFFmpeg } from '@/lib/transcoding/ffmpeg';

export default async function SettingsPage() {
    const secretInfo = await getStreamSecretInfo();
    const transcodingSettings = await getTranscodingSettings();
    const ffmpegInfo = await detectFFmpeg();
    const cpuCount = cpus().length;
    const recommendedMaxSessions = Math.min(cpuCount + 1, 10);

    return (
        <RoleGuard allowedRoles={[AuthRoles.Admin]}>
            <h1>Settings</h1>
            <p>Administrative settings and user management</p>

            <hr />

            <h2>User Management</h2>
            <ul>
                <li><Link href="/users">Manage Users</Link> - View, add, and edit users</li>
            </ul>

            <hr />

            <h2>Video Transcoding</h2>

            <h3>Active Sessions</h3>
            <TranscodingStatus />

            <hr />

            <h3>Transcoding Configuration</h3>
            <TranscodingSettings
                initialSettings={transcodingSettings}
                ffmpegInfo={ffmpegInfo}
                recommendedMaxSessions={recommendedMaxSessions}
            />

            <hr />

            <h2>Stream Authentication</h2>
            <StreamSecretManager
                secretPreview={secretInfo?.preview || 'Not available'}
                regenerateAction={regenerateAppStreamSecret}
            />
        </RoleGuard>
    );
}
