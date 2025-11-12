# Philos DBスキーマ全体像 (返信機能追加後)

このドキュメントは、現在のPhilosアプリケーションにおけるFirestoreデータベースの主要なコレクションとドキュメントの階層構造をテキスト形式で図示したものです。
コメントに返信するための`parentCommentId`フィールドを追加した際の構造を示します。

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
│           ├── {commentId_A} (ドキュメント)
│           │   ├── authorId: "{userId}"
│           │   ├── authorName: "田中 次郎"
│           │   ├── content: "承知いたしました。"
│           │   └── parentCommentId: null  (← トップレベルのコメント)
│           │
│           └── {commentId_B} (ドキュメント)
│               ├── authorId: "{anotherUserId}"
│               ├── authorName: "佐藤 花子"
│               ├── content: "質問なのですが..."
│               └── parentCommentId: "{commentId_A}" (← commentId_Aへの返信)
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
            ├── {commentId_X} (ドキュメント)
            │   ├── authorId: "{userId}"
            │   ├── authorName: "鈴木 一郎"
            │   ├── content: "素晴らしいデザインですね！"
            │   └── parentCommentId: null
            │
            └── {commentId_Y} (ドキュメント)
                ├── authorId: "{anotherUserId}"
                ├── authorName: "高橋 美咲"
                ├── content: "同感です！"
                └── parentCommentId: "{commentId_X}" (← commentId_Xへの返信)
```

### 図の説明

*   **`├──`** と **`└──`**: 階層構造を示します。
*   **`(コレクション)`**: Firestoreのコレクションを表します。
*   **`(ドキュメント)`**: Firestoreのドキュメントを表します。`{userId}`や`{messageId}`は実際のドキュメントIDが入るプレースホルダです。
*   **`(サブコレクション)`**: ドキュメントの下にネストされたコレクションを表します。
*   **`フィールド: 値`**: ドキュメントが持つデータの例です。
*   **`parentCommentId`**: このフィールドが、コメントへの返信機能の核となります。
    *   値が `null` または存在しない場合は、トップレベルのコメントです。
    *   値に他のコメントのIDが入っている場合、そのコメントへの返信であることを示します。
*   **`←`**: どのデータを参照しているかなど、補足情報を示します。
