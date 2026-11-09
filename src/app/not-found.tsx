import type { Metadata } from 'next';
import { NotFound } from '@/components/NotFound';

export const metadata: Metadata = {
  title: 'GAME NOT FOUND',
};

export default function NotFoundPage() {
  return (
    <div className="container">
      <NotFound />
    </div>
  );
}
