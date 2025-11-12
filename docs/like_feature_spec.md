# 「いいね機能」実装仕様書 (従業員向け画面)

## 1. 概要

このドキュメントは、従業員向け画面に表示される「経営層メッセージ」および「ビデオコンテンツ」に対する「いいね機能」の実装仕様を定義します。

ユーザーは各コンテンツに対して「いいね」をすることができ、そのアクションはリアルタイムでコンテンツの「いいね数」に反映されます。また、一度「いいね」したコンテンツを再度クリックすることで、「いいね」を取り消すことができます。

## 2. データベース設計の前提

本機能は、以下のFirestoreデータベース設計に基づき実装する必要があります。

-   各コンテンツ（`executiveMessages/{messageId}` または `videos/{videoId}`）は、`likes`というサブコレクションを持ちます。
-   ユーザーが「いいね」をすると、この`likes`サブコレクション内に、**そのユーザーのUIDをドキュメントIDとして**新しいドキュメントが作成されます。
    -   例: `/videos/{videoId}/likes/{userId}`
-   この`likes`ドキュメントには、いいねされた日時（`likedAt: serverTimestamp()`）などの情報を格納します。
-   親ドキュメント（`executiveMessages`または`videos`）は、集計値として`likesCount`フィールドを持ちます。

## 3. 実装要件

### 3.1. 「いいね」ボタンのUI

-   各コンテンツには、「いいね」を表すアイコン（例: `Heart`アイコン）と、現在のいいね数を表示するコンポーネントを設置してください。
-   ボタンは、現在のユーザーがそのコンテンツを「いいね」済みかどうかに応じて、見た目が変わる必要があります。
    -   **未いいね状態**: アイコンはアウトライン（線画）で表示。
    -   **いいね済み状態**: アイコンは塗りつぶしで表示。
-   現在のユーザーがいいね済みかどうかを判断するには、`/videos/{videoId}/likes/{currentUser.uid}` のドキュメントが存在するかどうかを確認します。`useDoc`フックなどが利用できます。

### 3.2. 「いいね」アクションの実装

ユーザーが「いいね」ボタンをクリックした際の処理を実装します。処理は、現在のユーザーがいいね済みかどうかで分岐します。

#### a) まだ「いいね」していない場合

1.  **`likes`サブコレクションへのドキュメント追加:**
    -   対象のコンテンツの`likes`サブコレクションに、現在のユーザーのUID (`user.uid`) をドキュメントIDとして新しいドキュメントを作成します。
    -   `setDoc` を使用し、ドキュメントのデータとして `{ likedAt: serverTimestamp() }` を保存します。
    -   例: `setDoc(doc(firestore, 'videos', videoId, 'likes', user.uid), { likedAt: serverTimestamp() });`

2.  **`likesCount`のインクリメント:**
    -   トランザクションまたは `updateDoc` と `increment()` を使用して、親ドキュメントの `likesCount` フィールドを `1` 増やします。
    -   例: `updateDoc(doc(firestore, 'videos', videoId), { likesCount: increment(1) });`

#### b) 既に「いいね」している場合（いいねの取り消し）

1.  **`likes`サブコレクションからのドキュメント削除:**
    -   `likes`サブコレクションから、現在のユーザーのUIDをドキュメントIDとするドキュメントを削除します。
    -   例: `deleteDoc(doc(firestore, 'videos', videoId, 'likes', user.uid));`

2.  **`likesCount`のデクリメント:**
    -   `increment(-1)` を使用して、親ドキュメントの `likesCount` フィールドを `1` 減らします。
    -   例: `updateDoc(doc(firestore, 'videos', videoId), { likesCount: increment(-1) });`

### 3.3. セキュリティルール

Firestoreのセキュリティルールでは、ユーザーは自身のUIDに紐づく`likes`ドキュメントのみ作成・削除できるように制御する必要があります。（現在の開発用ルールは寛容ですが、本番環境では必須の考慮事項です）

```rules
// 例: videosコレクションに対するいいねのルール
match /videos/{videoId}/likes/{userId} {
  // 自分のいいねのみ作成・削除を許可
  allow create, delete: if request.auth != null && request.auth.uid == userId;
  // 誰でも読み取りは可能
  allow read: if request.auth != null;
}
```

---

以上の仕様に基づき、ユーザー体験が良く、データベースとの整合性が取れた「いいね機能」の実装をお願いします。
