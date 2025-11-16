import { and, eq, isNull } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { getDb } from '@/lib/database/db';
import { tuners } from '@/lib/database/schema';

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
            <h1>Edit Tuner: {tuner.name}</h1>

            <form action={`/api/tuners/${tuner.id}`} method="POST">
                <div>
                    <label htmlFor="name">Tuner Name</label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        defaultValue={tuner.name}
                    />
                </div>
                <div>
                    <label htmlFor="path">Path</label>
                    <input
                        type="text"
                        id="path"
                        name="path"
                        defaultValue={tuner.path}
                    />
                </div>
                <div>
                    <label htmlFor="is_active">Active</label>
                    <input
                        type="checkbox"
                        id="is_active"
                        name="is_active"
                        defaultChecked={tuner.is_active}
                    />
                </div>
                <button type="submit">Update Tuner</button>
            </form>

            <hr />
            <h2>Tuner Information</h2>
            <dl>
                <dt>ID</dt>
                <dd>{tuner.id}</dd>

                <dt>Last Scanned</dt>
                <dd>{tuner.last_scanned ? new Date(tuner.last_scanned).toLocaleString() : 'Never'}</dd>

                <dt>Created</dt>
                <dd>{new Date(tuner.created_at).toLocaleString()}</dd>

                <dt>Last Modified</dt>
                <dd>{new Date(tuner.modified_at).toLocaleString()}</dd>
            </dl>

            <p>
                <a href={`/tuners/${tuner.id}`}>Back to Tuner</a>
            </p>
        </>
    );
}
