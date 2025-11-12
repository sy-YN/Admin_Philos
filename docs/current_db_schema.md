# Philos DBスキーマ全体像

このドキュメントは、現在のPhilosアプリケーションにおけるFirestoreデータベースの主要なコレクションとドキュメントの階層構造をテキスト形式で図示したものです。

```text
Firestoreデータベース
├── users (コレクション)
│   └── {userId} (ドキュメント)
│       ├── uid: "..."
│       ├── displayName: "山田 太郎"
│       ├── email: "yamada@example.com"
│       ├── role: "executive"
│       ├── department: "経営企画室"
│       ├── avatarUrl: "https://..."
│       └── ...
│
├── executiveMessages (コレクション)
│   └── {messageId} (ドキュメント)
│       ├── title: "第4四半期 全社ミーティング"
│       ├── content: "CEOからのメッセージです..."
│       ├── authorId: "{userId}"       (← usersコレクションのドキュメントを参照)
│       ├── authorName: "山田 太郎"
│       ├── likesCount: 25
│       ├── commentsCount: 3
│       │
│       ├── likes (サブコレクション)
│       │   └── {userId} (ドキュメント)  (←「いいね」した人のIDがドキュメントIDになる)
│       │       └── likedAt: Timestamp
│       │
│       └── comments (サブコレクション)
│           └── {commentId} (ドキュメント)
│               ├── authorId: "{userId}" (← コメント投稿者のID)
│               ├── authorName: "田中 次郎"
│               └── content: "承知いたしました。"
│
└── videos (コレクション)
    └── {videoId} (ドキュメント)
        ├── title: "新プロダクトのコンセプト紹介"
        ├── description: "デザインチームからの共有です..."
        ├── src: "https://..."
        ├── thumbnailUrl: "https://..."
        ├── uploaderId: "{userId}"      (← アップロード者のID)
        ├── likesCount: 58
        ├── commentsCount: 12
        │
        ├── likes (サブコレクション)
        │   └── {userId} (ドキュメント)
        │       └── likedAt: Timestamp
        │
        └── comments (サブコレクション)
            └── {commentId} (ドキュメント)
                ├── authorId: "{userId}"
                ├── authorName: "佐藤 花子"
                └── content: "素晴らしいデザインですね！"

```

### 図の説明

*   **`├──`** と **`└──`**: 階層構造を示します。
*   **`(コレクション)`**: Firestoreのコレクションを表します。
*   **`(ドキュメント)`**: Firestoreのドキュメントを表します。`{userId}`や`{messageId}`は実際のドキュメントIDが入るプレースホルダです。
*   **`(サブコレクション)`**: ドキュメントの下にネストされたコレクションを表します。
*   **`フィールド: 値`**: ドキュメントが持つデータの例です。
*   **`←`**: どのデータを参照しているかなど、補足情報を示します。
