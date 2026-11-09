import type { Metadata } from 'next';
import { StaticPage } from '@/components/StaticPage';

export const metadata: Metadata = {
  title: 'プライバシーポリシー',
};

// TODO: 本文確定後に差し替える
export default function PrivacyPolicyPage() {
  return (
    <div className="container">
      <StaticPage title="プライバシーポリシー">
        <p>準備中です。</p>
      </StaticPage>
    </div>
  );
}
