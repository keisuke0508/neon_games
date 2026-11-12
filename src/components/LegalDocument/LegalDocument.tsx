import { LEGAL_SITE } from '@/content/legal/site';
import type { LegalBlock, LegalDocument as LegalDocumentData } from '@/content/legal/types';
import { StaticPage } from '../StaticPage';
import styles from './LegalDocument.module.scss';

export type LegalDocumentProps = {
  document: LegalDocumentData;
};

function Block({ block }: { block: LegalBlock }) {
  if (typeof block === 'string') return <p>{block}</p>;
  if ('ordered' in block) {
    return (
      <ol className={styles.ordered}>
        {block.ordered.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    );
  }
  return (
    <ul className={styles.bullets}>
      {block.bullets.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

/** 利用規約・プライバシーポリシーの本文 */
export function LegalDocument({ document }: LegalDocumentProps) {
  const { establishedOn } = LEGAL_SITE;
  return (
    <StaticPage title={document.title}>
      <div className={styles.preamble}>
        {document.preamble.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
      {document.sections.map((section) => (
        <section key={section.heading} className={styles.section}>
          <h2>{section.heading}</h2>
          {section.blocks.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </section>
      ))}
      <p className={styles.established}>{establishedOn} 制定</p>
    </StaticPage>
  );
}
