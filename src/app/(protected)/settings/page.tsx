import Link from 'next/link';
import RoleGuard from '@/components/RoleGuard';
import { AuthRoles } from '@/lib/auth-roles';
import { getStreamSecretInfo, regenerateAppStreamSecret } from '@/lib/actions/settings';
import StreamSecretManager from '@/components/stream-secret-manager';
import TranscodingSettings, { FFmpegStatusCard } from '@/components/transcoding-settings';
import TranscodingStatus from '@/components/transcoding-status';
import { getTranscodingSettings } from '@/lib/settings';
import { detectFFmpeg } from '@/lib/transcoding/ffmpeg';

async function getRecommendedMaxSessions(): Promise<number> {
    const { cpus } = await import('node:os');
    const cpuCount = cpus().length;
    return Math.min(cpuCount + 1, 10);
}

export default async function SettingsPage() {
    const secretInfo = await getStreamSecretInfo();
    const transcodingSettings = await getTranscodingSettings();
    const ffmpegInfo = await detectFFmpeg();
    const recommendedMaxSessions = await getRecommendedMaxSessions();

    return (
        <RoleGuard allowedRoles={[AuthRoles.Admin]}>
            <div className="container">
                <div className="mb-6">
                    <h1 className="mb-2">Settings</h1>
                    <p className="text-secondary m-0">
                        Configure application settings and manage system resources
                    </p>
                </div>

                <div className="grid gap-5">
                    <section>
                        <h2 className="mt-0 mb-3 text-xl">
                            User Management
                        </h2>
                        <Link
                            href="/users"
                            className="settings-link inline-flex items-center gap-2 p-4
                                rounded no-underline text-primary transition"
                            style={{
                                backgroundColor: 'var(--color-bg-secondary)',
                                border: '1px solid var(--color-border)',
                            }}
                        >
                            <span>👥</span>
                            <span>Manage Users</span>
                            <span className="text-tertiary" style={{ marginLeft: 'auto' }}>→</span>
                        </Link>
                    </section>

                    <section>
                        <h2 className="mt-0 mb-3 text-xl">
                            Video Transcoding
                        </h2>

                        <div className="grid gap-4">
                            <FFmpegStatusCard ffmpegInfo={ffmpegInfo} />

                            <div>
                                <h3 className="mt-0 mb-3 text-lg">
                                    Active Sessions
                                </h3>
                                <TranscodingStatus />
                            </div>

                            <div>
                                <h3 className="mt-0 mb-3 text-lg">
                                    Configuration
                                </h3>
                                <TranscodingSettings
                                    initialSettings={transcodingSettings}
                                    ffmpegInfo={ffmpegInfo}
                                    recommendedMaxSessions={recommendedMaxSessions}
                                />
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="mt-0 mb-3 text-xl">
                            Stream Authentication
                        </h2>
                        <StreamSecretManager
                            secretPreview={secretInfo?.preview || 'Not available'}
                            regenerateAction={regenerateAppStreamSecret}
                        />
                    </section>
                </div>
            </div>
        </RoleGuard>
    );
}
