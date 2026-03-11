import { getGameSessions } from '@/app/actions/reports';
import ReportsClient from './ReportsClient';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
    const sessions = await getGameSessions();
    return <ReportsClient initialSessions={sessions} />;
}
