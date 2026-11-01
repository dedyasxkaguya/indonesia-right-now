import type { Metadata } from 'next';
import { GovTopicPage } from '@/components/igs/GovTopicPage';
export const metadata: Metadata = { title: 'Sosial & Publik' };
export default function Page() { return <GovTopicPage slug="sosial-publik" />; }
