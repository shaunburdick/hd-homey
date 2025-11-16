import { and, eq, isNull } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { getDb } from '@/lib/database/db';
import { tuners } from '@/lib/database/schema';
import { AdminLink } from '@/components/AdminLink';
import RoleGuard from '@/components/RoleGuard';
import { AuthRoles } from '@/lib/auth-roles';

interface PageParams {
    id: string
}

export default async function Page(props: { params: Promise<PageParams> }) {
    const params = await props.params;
    const db = await getDb();

    const tuner = await db.query.tuners.findFirst({
        where: and(
            eq(tuners.id, parseInt(params.id, 10)),
            isNull(tuners.deleted_at)
        ),
        with: {
            channels: true
        }
    });

    if (!tuner) {
        notFound();
    }

    return (
        <>
            <h1>{tuner.name}</h1>
            <nav>
                <AdminLink href={`/tuners/${tuner.id}/edit`}>Edit Tuner</AdminLink>
            </nav>

            <h2>Channels</h2>
            <RoleGuard allowedRoles={[AuthRoles.Admin]}>
                <form action={`/tuners/${tuner.id}/poll`} method="POST">
                    <button type="submit">
                        Refresh Channels
                    </button>
                </form>
            </RoleGuard>
            {tuner.channels.sort((a, b) => parseFloat(a.guideNumber) - parseFloat(b.guideNumber)).map(channel =>
                <p key={channel.id}>
                    <a href={`/tuners/${tuner.id}/channel/${channel.id}`}>{channel.guideNumber}: {channel.guideName}</a>
                </p>)}
        </>
    );
}
