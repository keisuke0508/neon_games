/** spec.md「カテゴリの仕様」 */
export type Category = {
  id: string;
  categoryName: string;
};

/** spec.md「ゲームの仕様」 */
export type Game = {
  id: string;
  title: string;
  /** 16:9 の画像パス（public 配下）。未用意の場合は空文字 */
  image: string;
  categoryIds: string[];
};
