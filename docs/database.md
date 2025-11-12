
# データベース設計

このドキュメントでは、Philosアプリケーションのバックエンドで使用するデータベースの構造を定義します。データベースには、スケーラビリティとリアルタイム性を考慮し、NoSQLデータベースであるCloud Firestoreを採用することを想定しています。

---

## データモデル

### 1. `users`

各ユーザーの情報を格納するコレクション。

*   **コレクション**: `users`
*   **ドキュメントID**: `userId` (Firebase AuthenticationのUID)
*   **フィールド**:
    *   `email` (String): メールアドレス
    *   `displayName` (String): 表示名
    *   `avatarUrl` (String): プロフィール画像のURL
    *   `role` (String): ユーザー権限 (`employee`, `manager`, `executive`, `admin`など)
    *   `department` (String): 所属部署
    *   `createdAt` (Timestamp): アカウント作成日時

---

### 2. `posts`

従業員が投稿する掲示板の投稿データを格納するコレクション。

*   **コレクション**: `posts`
*   **ドキュメントID**: `postId` (自動生成)
*   **フィールド**:
    *   `authorId` (String): 投稿者の`userId`への参照
    *   `content` (String): 投稿のテキスト内容
    *   `createdAt` (Timestamp): 投稿日時
    *   `likesCount` (Number): いいねの数（集計値）
    *   `sentiment` (Object): AIによる感情分析の結果
        *   `score` (Number): 感情スコア (-1.0 〜 1.0)
        *   `label` (String): 感情ラベル (`positive`, `negative`, `neutral`)
        *   `flagged` (Boolean): モデレーションのためにフラグが立てられたかどうか

#### サブコレクション: `likes`

投稿への「いいね」を管理します。誰がいいねしたかを記録するために使用します。

*   **コレクション**: `posts/{postId}/likes`
*   **ドキュメントID**: `userId`
*   **フィールド**:
    *   `likedAt` (Timestamp): いいねされた日時

#### サブコレクション: `comments`

投稿へのコメントを格納します。

*   **コレクション**: `posts/{postId}/comments`
*   **ドキュメントID**: `commentId` (自動生成)
*   **フィールド**:
    *   `authorId` (String): コメント投稿者の`userId`
    *   `content` (String): コメント内容
    *   `createdAt` (Timestamp): コメント投稿日時

---

### 3. `executiveMessages`

経営層からのメッセージを格納するコレクション。

*   **コレクション**: `executiveMessages`
*   **ドキュメントID**: `messageId` (自動生成)
*   **フィールド**:
    *   `authorId` (String): メッセージ作成者の`userId`
    *   `title` (String): メッセージのタイトル
    *   `content` (String): メッセージの全文
    *   `createdAt` (Timestamp): 公開日時
    *   `priority` (String): 重要度 (`high`, `normal`)
    *   `tags` (Array of Strings): 関連するタグのリスト (例: `["営業部", "本社", "新製品"]`)
    *   `likesCount` (Number): いいねの数（`likes`サブコレクションの集計値）
    *   `commentsCount` (Number): コメントの数（`comments`サブコレクションの集計値）
    *   `viewsCount` (Number): 表示回数

#### サブコレクション: `likes`

メッセージへの「いいね」を管理します。

*   **コレクション**: `executiveMessages/{messageId}/likes`
*   **ドキュメントID**: `userId`
*   **フィールド**:
    *   `likedAt` (Timestamp): いいねされた日時

#### サブコレクション: `comments`

メッセージへのコメントを格納します。

*   **コレクション**: `executiveMessages/{messageId}/comments`
*   **ドキュメントID**: `commentId` (自動生成)
*   **フィールド**:
    *   `authorId` (String): コメント投稿者の`userId`
    *   `content` (String): コメント内容
    *   `createdAt` (Timestamp): コメント投稿日時

---

### 4. `videos`

共有される動画コンテンツの情報を格納するコレクション。

*   **コレクション**: `videos`
*   **ドキュメントID**: `videoId` (自動生成)
*   **フィールド**:
    *   `title` (String): 動画のタイトル
    *   `description` (String): 動画の説明
    *   `src` (String): 動画ファイルのURL (Cloud Storageなど)
    *   `thumbnailUrl` (String): サムネイル画像のURL
    *   `tags` (Array of Strings): 関連するタグのリスト
    *   `uploadedAt` (Timestamp): アップロード日時
    *   `uploaderId` (String): アップロードしたユーザーの`userId`
    *   `likesCount` (Number): いいねの数（`likes`サブコレクションの集計値）
    *   `commentsCount` (Number): コメントの数（`comments`サブコレクションの集計値）
    *   `viewsCount` (Number): 表示回数

#### サブコレクション: `likes`

動画への「いいね」を管理します。

*   **コレクション**: `videos/{videoId}/likes`
*   **ドキュメントID**: `userId`
*   **フィールド**:
    *   `likedAt` (Timestamp): いいねされた日時

#### サブコレクション: `comments`

動画へのコメントを格納します。

*   **コレクション**: `videos/{videoId}/comments`
*   **ドキュメントID**: `commentId` (自動生成)
*   **フィールド**:
    *   `authorId` (String): コメント投稿者の`userId`
    *   `content` (String): コメント内容
    *   `createdAt` (Timestamp): コメント投稿日時

---

### 5. `notifications`

各ユーザーへの通知を格納するサブコレクション。

*   **コレクション**: `users/{userId}/notifications`
*   **ドキュメントID**: `notificationId` (自動生成)
*   **フィールド**:
    *   `type` (String): 通知の種類 (`new_executive_message`, `new_post`, `dashboard_update`など)
    *   `relatedItemId` (String): 関連アイテムのID (`messageId`や`postId`など)
    *   `isRead` (Boolean): ユーザーが既読かどうか
    *   `createdAt` (Timestamp): 通知の作成日時

---

### 6. `dashboardSnapshots`

パフォーマンスダッシュボード用の集計データを定期的に保存するコレクション。

*   **コレクション**: `dashboardSnapshots`
*   **ドキュメントID**: `snapshotId` (例: `2024-Q4-weekly-1`)
*   **フィールド**:
    *   `period` (String): 対象期間 (例: `2024-Q4`)
    *   `type` (String): スナップショットの種類 (`weekly`, `monthly`, `quarterly`)
    *   `departmentId` (String, Optional): 部署ごとのデータの場合、部署ID
    *   `engagementScore` (Number): エンゲージメントスコア
    *   `goalProgress` (Number): 目標達成率の平均
    *   `satisfactionScore` (Number): 従業員満足度スコア
    *   `createdAt` (Timestamp): スナップショットの生成日時

