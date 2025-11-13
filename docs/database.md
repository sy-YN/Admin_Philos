# データベース設計仕様書

このドキュメントでは、Philosアプリケーションのバックエンドで使用するデータベースの構造を定義します。データベースには、スケーラビリティとリアルタイム性を考慮し、NoSQLデータベースであるCloud Firestoreを採用します。

---

## 1. コレクション階層の概要

```text
Firestoreデータベース
├── users/{userId}
│
├── executiveMessages/{messageId}
│   ├── likes/{userId}
│   └── comments/{commentId}
│
└── videos/{videoId}
    ├── likes/{userId}
    └── comments/{commentId}
```

---

## 2. データモデル詳細

### 2.1. `users`

各ユーザーのプロフィール情報を格納するコレクション。

*   **コレクションパス**: `users`
*   **ドキュメントID**: `userId` (Firebase AuthenticationのUID)
*   **フィールド**:
    *   `uid` (String): ユーザーID (ドキュメントIDと同じ)
    *   `displayName` (String): 表示名
    *   `email` (String): メールアドレス
    *   `employeeId` (String, Optional): 社員番号
    *   `company` (String, Optional): 所属会社
    *   `department` (String, Optional): 所属部署
    *   `avatarUrl` (String, Optional): プロフィール画像のURL
    *   `role` (String): ユーザー権限 (`admin`, `executive`, `manager`, `employee`)
    *   `createdAt` (Timestamp): アカウント作成日時
    *   `updatedAt` (Timestamp): 最終更新日時

---

### 2.2. `executiveMessages`

経営層からのメッセージを格納するコレクション。

*   **コレクションパス**: `executiveMessages`
*   **ドキュメントID**: `messageId` (自動生成)
*   **フィールド**:
    *   `authorId` (String): メッセージ作成者の`userId`への参照
    *   `authorName` (String): メッセージ作成者の表示名
    *   `title` (String): メッセージのタイトル
    *   `content` (String): メッセージの全文
    *   `priority` (String): 重要度 (`high`, `normal`)
    *   `tags` (Array of Strings): 関連タグのリスト
    *   `createdAt` (Timestamp): 公開日時
    *   `updatedAt` (Timestamp): 最終更新日時
    *   `likesCount` (Number): いいねの数 (集計値)
    *   `commentsCount` (Number): コメントの数 (集計値)
    *   `viewsCount` (Number): 表示回数

#### 👉 サブコレクション: `executiveMessages/{messageId}/likes`

メッセージへの「いいね」を管理します。

*   **ドキュメントID**: `userId` (いいねしたユーザーのUID)
*   **フィールド**:
    *   `likedAt` (Timestamp): いいねされた日時

#### 👉 サブコレクション: `executiveMessages/{messageId}/comments`

メッセージへのコメントを格納します。**返信も同じコレクションにフラットに保存します。**

*   **ドキュメントID**: `commentId` (自動生成)
*   **フィールド**:
    *   `authorId` (String): コメント投稿者の`userId`
    *   `authorName` (String): コメント投稿者の表示名
    *   `content` (String): コメント内容
    *   `parentCommentId` (String | Null): **返信機能の要。** これが返信である場合、親コメントのID。トップレベルのコメントは`null`。
    *   `createdAt` (Timestamp): コメント投稿日時

---

### 2.3. `videos`

共有される動画コンテンツの情報を格納するコレクション。

*   **コレクションパス**: `videos`
*   **ドキュメントID**: `videoId` (自動生成)
*   **フィールド**:
    *   `title` (String): 動画のタイトル
    *   `description` (String): 動画の説明
    *   `src` (String): 動画ファイルのURL
    *   `thumbnailUrl` (String): サムネイル画像のURL
    *   `tags` (Array of Strings): 関連タグのリスト
    *   `uploaderId` (String): アップロードしたユーザーの`userId`
    *   `uploadedAt` (Timestamp): アップロード日時
    *   `likesCount` (Number): いいねの数 (集計値)
    *   `commentsCount` (Number): コメントの数 (集計値)
    *   `viewsCount` (Number): 表示回数

#### 👉 サブコレクション: `videos/{videoId}/likes`

動画への「いいね」を管理します。

*   **ドキュメントID**: `userId` (いいねしたユーザーのUID)
*   **フィールド**:
    *   `likedAt` (Timestamp): いいねされた日時

#### 👉 サブコレクション: `videos/{videoId}/comments`

動画へのコメントを格納します。**返信も同じコレクションにフラットに保存します。**

*   **ドキュメントID**: `commentId` (自動生成)
*   **フィールド**:
    *   `authorId` (String): コメント投稿者の`userId`
    *   `authorName` (String): コメント投稿者の表示名
    *   `content` (String): コメント内容
    *   `parentCommentId` (String | Null): **返信機能の要。** これが返信である場合、親コメントのID。トップレベルのコメントは`null`。
    *   `createdAt` (Timestamp): コメント投稿日時
