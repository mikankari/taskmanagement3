# 個人的タスク管理

チケット駆動開発のためのマルチタスク管理・自動化ツール

## 目的

- いま着手するタスクをすばやく決める
- タスクをすばやく共有する


## 特徴

- 進捗できるタスクのみを、期日順に、優先度とともに表示
- GitHub Pull Request, Trello カードをすばやく作成
- 日報を一瞬で作成・投稿

### スクリーンショット

- [タスク一覧画面](screenshots/index.png)
- [実装タスク追加画面](screenshots/add-created.png)
    - [作成した GitHub Pull Request の例](https://github.com/mikankari/test1/pull/50)
- [日報を書く画面](screenshots/write-daily.png)
    - [作成した日報の例](screenshots/daily.md)


## 背景

いまのタスクなにあったっけ

例：切りがいいとき、朝、定例 MTG、日報を書く

- 情報リソースが分散している
  - チケット見たり、GitHub 見たり
- 待ち状態のタスクも一緒にリストされる
- 細かい Todo を管理できない
  - チケットや GitHub ではステータス管理に留まる


## 仕様

### タスクが持つ要素

- Todo リスト
  - 上から順に完了する想定
  - 最初の未完了 Todo を表示する
  - 最初の未完了 Todo のテキストが「完了」で終わるものは、待ち状態としてタスクを隠す
- チケットへの紐付け
  - タスクのタイトルの初期値は、チケットのタイトルから拾う
  - 期日・優先度を拾う
  - いまのところ、次をサポートする
    - Redmine チケット
    - GitHub Issue

値なしなどで使えなかった場合は空振る

タスクには次の種類がある

- 実装
- レビュー
- 雑務：実装を伴わない作業・差し込みで来た依頼など


### 実装

- GitHub Pull Request を使う
- Todo リストは、最初のコメントにあるチェックボックスを使う
- チケットへの紐付けは、最初のコメントにある最初の URL を使う
- 最初のコメントのテンプレートとして ./templates/{{組織}}/{{リポジトリ名}}.md を使う

### レビュー

- GitHub Pull Request を使う
- Todo リストは、レビューのステータスを使う
  - 依頼中なら Todo は「レビュー」。タスクは表示する
  - 済みなら Todo は「レビュー完了」。隠す
- チケットへの紐付けは、最初のコメントにある最初の URL を使う

### 雑務

- Trello カードを使う
- Todo リストは、最初のチェックリストを使う
- チケットへの紐付けは、説明にある最初の URL を使う

### 日報を書く

- 前回日報を書いたときから比較して、完了した Todo を書く
  - 書いたあと、次回の比較のために、完了した Todo は変えない想定
- 所感として Slack の特定のチャンネルのその日のメッセージを使う
- テンプレートとして ./templates/dialy.md を使う
- いまのところ、次への書き込みをサポートする
  - DocBase
  - ローカルファイル
- このタイミングで、Todo がすべて完了したタスクはリストから削除する


## インストール

1. 依存パッケージインストール
  - npm install
  - そのあとビルドも動きます
2. 各サービス接続
  - 各サービスからトークンなどを得て、./config.json に書く
  - 使うサービスのみでよい
    - github
      - 実装・レビュー・チケット（GitHub Issue）に使う
      - Setting --> Developer settings --> Personal access tokens で "Generate new token" する
    - redmine
      - チケット（Redmine）に使う
      - 個人設定 で APIアクセスキー 「表示」する
    - trello
      - 雑務に使う
      - key は https://trello.com/app-key
      - token は https://trello.com/1/authorize?expiration=never&scope=read,write&response_type=token&name=taskmanagement&key= 最後に上の key をつける
      - idList はボード URL に .json をつけて探す
    - docbase
      - 日報（DocBase）に使う
      - 設定 --> アクセストークン で「トークンを作成」
    - slack
      - 日報の所感に使う
      - https://api.slack.com/apps で "Create new app"
      - OAuth & Permissions で User Token Scopes の "Add an OAuth Scope", "channels:history" を追加
      - "Install to Workspace"
      - channel はチャンネル情報の チャンネル ID
      - user はプロフィール --> その他 --> メンバー ID をコピー
    - directories
      - 実装・レビューに使う
      - {{組織}}/{{リポジトリ名}} を key、作業ディレクトリの絶対パスを value にした連想配列
    - diary
      - 日報に使う
      - type はローカルファイルに書く場合 file, DocBase の場合 docbase のいずれか
      - ローカルファイルに書く場合
        - path はファイルを置くディレクトリの絶対パス
        - title はファイル名の形式。[Mement.js の形式](https://momentjs.com/docs/#/displaying/format/)を使う
      - DocBase に書く場合
        - title はタイトルの形式。[Mement.js の形式](https://momentjs.com/docs/#/displaying/format/)を使う
        - tags はタグ文字列の配列
3. テンプレートを用意する
  - 構文は [Embedded JavaScript](https://github.com/mde/ejs#tags) を使う
  - ./templates/{{組織}}/{{リポジトリ名}}.md を用意する
    - 実装の最初のコメントに使う
    - [./templates/mikankari/test1.md](https://github.com/mikankari/taskmanagement3/blob/3.0.0/templates/mikankari/test1.md?plain=1) を参考
    - 変数は[フォーム入力値](https://github.com/mikankari/taskmanagement3/blob/3.0.0/modules/created-task.ts#L96)を使う
  - ./templates/daily.md を用意する
    - 日報に使う
    - [./templates/daily.example.md](https://github.com/mikankari/taskmanagement3/blob/3.0.0/templates/daily.example.md?plain=1) を参考
    - タスクは変数 tasks を使う。型は [Task](https://github.com/mikankari/taskmanagement3/blob/3.0.0/modules/types.ts#L2) の配列
    - 所感は変数 comments を使う。型は string[]
4. 実行
  - npm run start
