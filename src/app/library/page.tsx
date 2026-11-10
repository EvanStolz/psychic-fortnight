import type { Metadata } from 'next';
import { LibraryView } from '@/components/LibraryView';

export const metadata: Metadata = { title: 'Library · CRX Sniffer' };

export default function LibraryPage() {
  return <LibraryView />;
}
