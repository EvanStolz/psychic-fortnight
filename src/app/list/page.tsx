import type { Metadata } from 'next';
import { ListView } from '@/components/ListView';

export const metadata: Metadata = { title: 'Your list · CRX Sniffer' };

export default function ListPage() {
  return <ListView />;
}
