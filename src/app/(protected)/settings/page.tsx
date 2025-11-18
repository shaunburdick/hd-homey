import Link from 'next/link';
import RoleGuard from '@/components/RoleGuard';
import { AuthRoles } from '@/lib/auth-roles';
import { getStreamSecretInfo, regenerateAppStreamSecret } from '@/lib/actions/settings';
import StreamSecretManager from '@/components/stream-secret-manager';
import TranscodingSettings from '@/components/transcoding-settings';
import TranscodingStatus from '@/components/transcoding-status';
import { getTranscodingSettings } from '@/lib/settings';
import { detectFFmpeg } from '@/lib/transcoding/ffmpeg';

async function getRecommendedMaxSessions(): Promise<number> {
    const { cpus } = await import('os');
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
                <div style={{ marginBottom: 'var(--space-6)' }}>
                    <h1 style={{ marginBottom: 'var(--space-2)' }}>Settings</h1>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: 0 }}>
                        Configure application settings and manage system resources
                    </p>
                </div>

                <div style={{
                    display: 'grid',
                    gap: 'var(--space-5)',
                }}>
                    <section>
                        <h2 style={{
                            marginTop: 0,
                            marginBottom: 'var(--space-3)',
                            fontSize: 'var(--font-size-xl)',
                        }}>
                            User Management
                        </h2>
                        <Link
                            href="/users"
                            className="settings-link"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 'var(--space-2)',
                                padding: 'var(--space-3) var(--space-4)',
                                backgroundColor: 'var(--color-bg-secondary)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-md)',
                                textDecoration: 'none',
                                color: 'var(--color-text-primary)',
                                transition: 'all var(--transition-fast)',
                            }}
                        >
                            <span>👥</span>
                            <span>Manage Users</span>
                            <span style={{ marginLeft: 'auto', color: 'var(--color-text-tertiary)' }}>
                                →
                            </span>
                        </Link>
                    </section>

                    <section>
                        <h2 style={{
                            marginTop: 0,
                            marginBottom: 'var(--space-3)',
                            fontSize: 'var(--font-size-xl)',
                        }}>
                            Video Transcoding
                        </h2>

                        <div style={{
                            display: 'grid',
                            gap: 'var(--space-4)',
                        }}>
                            <div>
                                <h3 style={{
                                    marginTop: 0,
                                    marginBottom: 'var(--space-3)',
                                    fontSize: 'var(--font-size-lg)',
                                }}>
                                    Active Sessions
                                </h3>
                                <TranscodingStatus />
                            </div>

                            <div>
                                <h3 style={{
                                    marginTop: 0,
                                    marginBottom: 'var(--space-3)',
                                    fontSize: 'var(--font-size-lg)',
                                }}>
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
                        <h2 style={{
                            marginTop: 0,
                            marginBottom: 'var(--space-3)',
                            fontSize: 'var(--font-size-xl)',
                        }}>
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
