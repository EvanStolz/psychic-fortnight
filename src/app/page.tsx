import { Suspense } from 'react';
import { Check } from '@/components/Check';

export default function CheckPage() {
  return (
    <Suspense>
      <Check />
    </Suspense>
  );
}
