import { and, eq, isNull } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import EditTunerForm from './EditTunerForm';
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

    return <EditTunerForm tuner={tuner} />;
}
