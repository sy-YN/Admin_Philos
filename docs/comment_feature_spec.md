# 「コメント機能」および「コメント数集計」実装仕様書

## 1. 概要

このドキュメントは、「経営層メッセージ」および「ビデオコンテンツ」に対する「コメント機能」と、それに伴う「コメント数（`commentsCount`）」のリアルタイム集計機能の実装仕様を定義します。

ユーザーは各コンテンツに対してコメントを投稿したり、既存のコメントに返信したりできます。また、自身が投稿したコメントは削除できます。これらのアクションは、リアルタイムでコンテンツの `commentsCount` に反映される必要があります。

## 2. データベース設計の前提

本機能は、以下のFirestoreデータベース設計に基づき実装する必要があります。

-   各コンテンツ（`executiveMessages/{messageId}` または `videos/{videoId}`）は、`comments` というサブコレクションを持ちます。
-   `comments` サブコレクション内の各ドキュメントが、一つのコメント（または返信）を表します。
-   コメントドキュメントは、返信先を示す `parentCommentId` フィールドを持ちます（トップレベルのコメントの場合は `null`）。
-   親ドキュメント（`executiveMessages` または `videos`）は、集計値として `commentsCount` フィールドを持ちます。

## 3. 実装要件

### 3.1. コメント投稿フォーム

-   各コンテンツの下部には、新しいコメントを投稿するためのUI（テキストエリアと送信ボタン）を設置してください。
-   各コメントの横には、「返信する」ボタンを設置し、クリックするとそのコメントを親とする返信投稿用のUIが表示されるようにします。

### 3.2. コメント投稿時の処理 (`addDoc` + `updateDoc`)

ユーザーが新しいコメントまたは返信を投稿した際の処理を実装します。

1.  **`comments`サブコレクションへのドキュメント追加:**
    -   対象のコンテンツの `comments` サブコレクションに、`addDoc` を使用して新しいコメントドキュメントを追加します。
    -   ドキュメントのデータには、`authorId`, `authorName`, `content`, `parentCommentId`, そして `createdAt: serverTimestamp()` を含めます。
    -   例: `addDoc(collection(db, 'videos', videoId, 'comments'), newCommentData);`

2.  **`commentsCount`のインクリメント:**
    -   上記の処理と**同時に**、トランザクションまたは `updateDoc` と `increment()` を使用して、親ドキュメントの `commentsCount` フィールドを `1` 増やします。
    -   これは、コメントと返信の区別なく、`comments`サブコレクションにドキュメントが1つ増えるたびに行います。
    -   例: `updateDoc(doc(firestore, 'videos', videoId), { commentsCount: increment(1) });`

### 3.3. コメント削除時の処理 (`deleteDoc` + `updateDoc`)

ユーザーが自身のコメント（または返信）を削除した際の処理を実装します。

1.  **`comments`サブコレクションからのドキュメント削除:**
    -   `comments`サブコレクションから、対象のコメントドキュメントを `deleteDoc` を使用して削除します。
    -   例: `deleteDoc(doc(firestore, 'videos', videoId, 'comments', commentId));`

2.  **`commentsCount`のデクリメント:**
    -   上記の処理と**同時に**、`increment(-1)` を使用して、親ドキュメントの `commentsCount` フィールドを `1` 減らします。
    -   例: `updateDoc(doc(firestore, 'videos', videoId), { commentsCount: increment(-1) });`
    -   **注意**: コメントに複数の返信が付いている場合、親コメントを削除した際に、ぶら下がっている返信コメント（子コメント）も全て同時に削除し、その数だけ `commentsCount` を減らす必要があります。これはバッチ処理やCloud Functionsで行うのが一般的ですが、初期実装では親コメントのみの削除を想定しても構いません。

### 3.4. セキュリティルール

Firestoreのセキュリティルールでは、ユーザーは自身のコメントのみ作成・削除できるように制御する必要があります。

```rules
// 例: videosコレクションに対するコメントのルール
match /videos/{videoId}/comments/{commentId} {
  // ログインユーザーは誰でもコメントを読める
  allow read: if request.auth != null;
  // 自分のコメントのみ作成・削除を許可
  allow create: if request.auth != null && request.auth.uid == request.resource.data.authorId;
  allow delete: if request.auth != null && resource.data.authorId == request.auth.uid;
}
```

---

以上の仕様に基づき、ユーザーのインタラクションが `commentsCount` に正確に反映される、堅牢なコメント機能の実装をお願いします。
