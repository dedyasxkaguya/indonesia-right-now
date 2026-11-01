import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { StateCard } from '@/components/ui/StateCard';

export default function NotFound() {
  return <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8"><StateCard variant="empty" title="Halaman tidak ditemukan" description="Alamat ini tidak memiliki halaman yang tersedia." action={<Link href="/"><Button type="button">Kembali ke beranda</Button></Link>} /></div>;
}
