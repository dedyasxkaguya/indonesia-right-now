import type { Metadata } from 'next';
import { GovTopicPage } from '@/components/igs/GovTopicPage';
export const metadata: Metadata = { title: 'Daerah' };
export default function Page() { return <GovTopicPage slug="daerah" />; }
