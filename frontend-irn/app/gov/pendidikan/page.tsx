import type { Metadata } from 'next';
import { GovTopicPage } from '@/components/igs/GovTopicPage';
export const metadata: Metadata = { title: 'Pendidikan' };
export default function Page() { return <GovTopicPage slug="pendidikan" />; }
