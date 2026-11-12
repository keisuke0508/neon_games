import type { Metadata } from 'next';
import { LegalDocument } from '@/components/LegalDocument';
import { PRIVACY } from '@/content/legal/privacy';

export const metadata: Metadata = {
  title: 'プライバシーポリシー',
  description: 'NEON GAMES のプライバシーポリシーです。',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="container">
      <LegalDocument document={PRIVACY} />
    </div>
  );
}
