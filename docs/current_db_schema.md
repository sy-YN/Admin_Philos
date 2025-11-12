# Philos DBスキーマ全体像 (返信機能追加後 - 代替案)

このドキュメントは、現在のPhilosアプリケーションにおけるFirestoreデータベースの主要なコレクションとドキュメントの階層構造をテキスト形式で図示したものです。

**これは、コメントへの返信機能を「`replies`サブコレクション」で実装した場合の設計案です。**

```text
Firestoreデータベース
├── users (コレクション)
│   └── {userId} (ドキュメント)
│       ├── uid: "..."
│       ├── displayName: "山田 太郎"
│       └── ...
│
├── executiveMessages (コレクション)
│   └── {messageId} (ドキュメント)
│       ├── title: "第4四半期 全社ミーティング"
│       ├── authorId: "{userId}"
│       ├── likesCount: 25
│       ├── commentsCount: 3 (※この集計が非常に困難になる)
│       │
│       ├── likes (サブコレクション)
│       │   └── {userId} (ドキュメント)
│       │
│       └── comments (サブコレクション)
│           └── {commentId_A} (ドキュメント)
│               ├── authorId: "{userId}"
│               ├── content: "承知いたしました。"
│               │
│               └── replies (サブコレクション)  <-- commentId_Aへの返信をここに格納
│                   └── {replyId_1} (ドキュメント)
│                       ├── authorId: "{anotherUserId}"
│                       ├── content: "質問なのですが..."
│                       └── createdAt: Timestamp
│
└── videos (コレクション)
    └── {videoId} (ドキュメント)
        ├── title: "新プロダクトのコンセプト紹介"
        ...
        │
        ├── likes (サブコレクション)
        │   └── {userId} (ドキュ...)