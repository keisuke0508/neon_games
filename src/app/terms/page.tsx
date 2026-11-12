import type { Metadata } from 'next';
import { LegalDocument } from '@/components/LegalDocument';
import { TERMS } from '@/content/legal/terms';

export const metadata: Metadata = {
  title: '利用規約',
  description: 'NEON GAMES の利用規約です。',
};

export default function TermsPage() {
  return (
    <div className="container">
      <LegalDocument document={TERMS} />
    </div>
  );
}
