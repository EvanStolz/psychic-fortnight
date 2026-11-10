import type { Metadata } from 'next';
import { ExportView } from '@/components/ExportView';

export const metadata: Metadata = { title: 'Export · CRX Sniffer' };

export default function ExportPage() {
  return <ExportView />;
}
