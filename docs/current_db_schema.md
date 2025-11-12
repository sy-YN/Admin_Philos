# Philos DBスキーマ全体像 (返信機能追加後)

このドキュメントは、現在のPhilosアプリケーションにおけるFirestoreデータベースの主要なコレクションとドキュメントの階層構造をテキスト形式で図示したものです。

**これは、コメントへの返信機能を「`parentCommentId`フィールド」で実装した場合の設計案です。**

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
│       ├── commentsCount: 3
│       │
│       ├── likes (サブコレクション)
│       │   └── {userId} (ドキュメント)
│       │
│       └── comments (サブコレクション)
│           ├── {commentId_A} (ドキュメント)
│           │   ├── authorId: "{userId}"
│           │   ├── content: "承知いたしました。"
│           │   ├── parentCommentId: null  <-- トップレベルのコメント
│           │   └── createdAt: "2024-08-05T10:00:00Z"
│           │
│           └── {commentId_B} (ドキュメント)
│               ├── authorId: "{anotherUserId}"
│               ├── content: "質問なのですが..."
│               ├── parentCommentId: "{commentId_A}"  <-- commentId_Aへの返信
│               └── createdAt: "2024-08-05T10:05:15Z"
│
└── videos (コレクション)
    └── {videoId} (ドキュメント)
        ├── title: "新プロダクトのコンセプト紹介"
        ...
        │
        ├── likes (サブコレクション)
        │   └── {userId} (ドキュ...)
        │
        └── comments (サブコレクション)
            └── {commentId_X} (ドキュ...)

```
