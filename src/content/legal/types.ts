/** 規約・ポリシーの本文の組み立て */
export type LegalBlock =
  /** 段落 */
  | string
  /** 番号付きの項目（1. 2. …） */
  | { ordered: readonly string[] }
  /** 箇条書き */
  | { bullets: readonly string[] };

export type LegalSection = {
  heading: string;
  blocks: readonly LegalBlock[];
};

export type LegalDocument = {
  title: string;
  /** 前文 */
  preamble: readonly string[];
  sections: readonly LegalSection[];
};
