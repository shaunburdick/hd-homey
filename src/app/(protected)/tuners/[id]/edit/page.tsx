import { and, eq, isNull } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getDb } from '@/lib/database/db';
import { tuners } from '@/lib/database/schema';
import { PageHeader } from '@/components/layouts/PageHeader';
import { Card } from '@/components/Card';

interface PageParams {
    id: string
};

export default async function EditTunerPage(props: { params: Promise<PageParams> }) {
    const params = await props.params;
    const db = await getDb();

    const tuner = await db.query.tuners.findFirst({
        where: and(
            eq(tuners.id, parseInt(params.id, 10)),
            isNull(tuners.deleted_at)
        )
    });

    if (!tuner) {
        notFound();
    }

    return (
        <>
            <Link href={`/tuners/${tuner.id}`} className="back-link">
                ← Back to Tuner
            </Link>

            <PageHeader
                title={`Edit Tuner: ${tuner.name}`}
                subtitle="Update tuner settings and configuration"
            />

            <div className="grid-2col">
                <Card title="Tuner Settings">
                    <form action={`/api/tuners/${tuner.id}`} method="POST">
                        <div className="form-group">
                            <label htmlFor="name">
                                Tuner Name
                                <span className="required" aria-label="required">*</span>
                            </label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                defaultValue={tuner.name}
                                required
                                aria-required="true"
                            />
                            <small className="form-help">
                                A friendly name to identify this tuner
                            </small>
                        </div>

                        <div className="form-group">
                            <label htmlFor="path">
                                Path (URL)
                                <span className="required" aria-label="required">*</span>
                            </label>
                            <input
                                type="url"
                                id="path"
                                name="path"
                                defaultValue={tuner.path}
                                placeholder="http://192.168.1.100"
                                required
                                aria-required="true"
                            />
                            <small className="form-help">
                                The network address of your HDHomeRun device
                            </small>
                        </div>

                        <div className="form-group">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    name="is_active"
                                    defaultChecked={tuner.is_active}
                                />
                                <span>Active</span>
                            </label>
                            <small className="form-help">
                                Inactive tuners will not be available for streaming
                            </small>
                        </div>

                        <button type="submit" className="btn-primary">
                            Update Tuner
                        </button>
                    </form>
                </Card>

                <Card title="Tuner Information">
                    <dl className="info-list">
                        <div>
                            <dt>ID</dt>
                            <dd>{tuner.id}</dd>
                        </div>

                        <div>
                            <dt>Last Scanned</dt>
                            <dd>{tuner.last_scanned ? new Date(tuner.last_scanned).toLocaleString() : 'Never'}</dd>
                        </div>

                        <div>
                            <dt>Created</dt>
                            <dd>{new Date(tuner.created_at).toLocaleString()}</dd>
                        </div>

                        <div>
                            <dt>Last Modified</dt>
                            <dd>{new Date(tuner.modified_at).toLocaleString()}</dd>
                        </div>
                    </dl>
                </Card>
            </div>
        </>
    );
}
