import { render, screen } from '@testing-library/react';
import { PRIVACY } from '@/content/legal/privacy';
import { LEGAL_SITE } from '@/content/legal/site';
import { TERMS } from '@/content/legal/terms';
import { LegalDocument } from './LegalDocument';

describe('LegalDocument', () => {
  it.each([
    ['利用規約', TERMS],
    ['プライバシーポリシー', PRIVACY],
  ])('%s：見出し、すべての条文、制定日を表示する（お問い合わせ窓口は載せない）', (title, doc) => {
    render(<LegalDocument document={doc} />);
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(doc.sections.map((s) => s.heading));
    expect(screen.queryByText(/お問い合わせ/)).toBeNull();
    expect(screen.getByText(`${LEGAL_SITE.establishedOn} 制定`)).toBeInTheDocument();
  });

  it('利用規約の条番号は 第1条 から順に連続している', () => {
    TERMS.sections.forEach((s, i) => expect(s.heading.startsWith(`第${i + 1}条`)).toBe(true));
  });

  it('プライバシーポリシーの項番号は 1 から順に連続している', () => {
    PRIVACY.sections.forEach((s, i) => expect(s.heading.startsWith(`${i + 1}. `)).toBe(true));
  });
});
