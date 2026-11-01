import type { Metadata } from 'next';
import type { PropsWithChildren } from 'react';
import { GovLayoutProviders } from '@/components/igs/GovLayoutProviders';

export const metadata: Metadata = {
  title: { default: 'Indonesia Gov Stats', template: '%s · Gov Stats' },
  description: 'Data terbuka Indonesia untuk membaca indikator wilayah, anggaran, layanan, dan kesejahteraan.',
};

export default function IgsLayout({ children }: PropsWithChildren) {
  return <GovLayoutProviders>{children}</GovLayoutProviders>;
}
