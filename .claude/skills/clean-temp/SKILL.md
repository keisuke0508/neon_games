---
name: clean-temp
description: temp ディレクトリの中を、spec.md と隠しファイルだけ残して空にする。仮のデザインやモックを片付けるときに使う。
disable-model-invocation: true
---

# temp ディレクトリの片付け

リポジトリ直下の `temp/` から、`temp/spec.md` と隠しファイル以外のファイルとディレクトリをすべて削除します。サブディレクトリも対象です。

**隠しファイル（名前が `.` で始まるもの。`.DS_Store`、`.gitkeep` など）は削除しません。** `temp/` の直下にある隠しディレクトリも、中身ごと残します。

## 手順

1. リポジトリのルートに移動し、`temp/` と `temp/spec.md` があることを確かめます。どちらかがなければ、何も消さずに止めて、ユーザーに伝えます。

   ```sh
   cd "$(git rev-parse --show-toplevel)"
   test -d temp && test -f temp/spec.md
   ```

2. 削除の対象を一覧にします。対象がなければ「temp はすでに spec.md（と隠しファイル）だけです」と伝えて終わります。

   ```sh
   find temp -mindepth 1 -maxdepth 1 ! -name spec.md ! -name '.*'
   ```

3. 対象を削除します。`temp/` の直下で、`spec.md` と隠しファイル以外のものだけを消し、`temp/` の外には触れません。

   ```sh
   find temp -mindepth 1 -maxdepth 1 ! -name spec.md ! -name '.*' -exec rm -rf {} +
   ```

4. `temp/` に `spec.md` と隠しファイルだけが残っていることを確かめます。

   ```sh
   ls -A temp
   ```

5. 削除したファイルが、まだどこかから参照されていないか調べます。デザイン資料（`design/`）はモックを参照していることがあるためです。

   ```sh
   grep -rn "temp/" design docs --include="*.md"
   ```

   `temp/spec.md` 以外への参照が見つかったら、ファイル名と行をユーザーに伝えてください。参照先がなくなったリンクです。資料を書き換えるかはユーザーに確認し、勝手に直さないでください。

## 報告

最後に、次のことを短く伝えます。

- 削除したファイルとディレクトリの一覧（数が多ければ、直下の名前だけ）
- `temp/` に `spec.md` と隠しファイルだけが残っていること
- 手順5で見つかった、切れた参照（あれば）

## 注意

- `temp/spec.md` は消さないでください。中身の変更もしません。
- 隠しファイルと隠しディレクトリは消さないでください。
- 削除は元に戻せません。ただし git で管理しているファイルは、`git restore` で戻せます。
