# `users` と `executiveMessages` の関係性

`users` コレクションと `executiveMessages` コレクションは、直接の親子関係（サブコレクション）ではありませんが、ドキュメントに保存されたID（`authorId` や `userId`）を通じて相互に関連付けられています。

以下の図は、その「参照関係」を示したものです。

```text
Firestoreデータベース
├── users (コレクション)
│   │
│   ├── user_yamada (ドキュメント)  <-- ユーザー「山田太郎」
│   │   ├── displayName: "山田 太郎"
│   │   └── role: "executive"
│   │
│   └── user_tanaka (ドキュメント)  <-- ユーザー「田中」
│       ├── displayName: "田中"
│       └── role: "employee"
│
│
└── executiveMessages (コレクション)
    │
    └── message_A (ドキュメント)
        ├── authorId: "user_yamada"  <-- usersコレクションの "user_yamada" を参照
        ├── title: "第4四半期 全社ミーティング"
        │
        ├── comments (サブコレクション)
        │   └── comment_001 (ドキュメント)
        │       ├── authorId: "user_tanaka"  <-- usersコレクションの "user_tanaka" を参照
        │       └── content: "承知いたしました。"
        │
        └── likes (サブコレクション)
            └── user_tanaka (ドキュメント)  <-- ドキュメントIDが "user_tanaka" を参照
                └── likedAt: "2024-08-01T10:00:00Z"
```

### 図の説明

*   メッセージ (`message_A`) の `authorId` フィールドに `"user_yamada"` と保存することで、このメッセージがユーザー「山田太郎」によって作成されたことを示しています。
*   コメント (`comment_001`) の `authorId` フィールドに `"user_tanaka"` と保存することで、このコメントがユーザー「田中」によって投稿されたことを示しています。
*   `likes` サブコレクションでは、ドキュメントのID自体を `userId` (`user_tanaka`) にすることで、ユーザー「田中」がこのメッセージに「いいね」したことを記録しています。
