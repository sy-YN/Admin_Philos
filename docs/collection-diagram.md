# Firestore コレクション構造図

このドキュメントは、`executiveMessages` および `videos` コレクションと、それに関連するサブコレクションの構造を視覚的に示します。

```mermaid
graph TD
    subgraph Firestore Database
        direction LR

        usersCollection["users (collection)"]
        userDoc["User Document<br>{userId}"]
        usersCollection --> userDoc

        subgraph Executive Messages
            direction TB
            execMessages["executiveMessages (collection)"]
            execMessageDoc["Message Document<br>{messageId}<br>authorId: {userId}"]
            
            execLikes["likes (subcollection)"]
            execLikeDoc["Like Document<br>{userId}"]

            execComments["comments (subcollection)"]
            execCommentDoc["Comment Document<br>{commentId}<br>authorId: {userId}"]
            
            execMessages --> execMessageDoc
            execMessageDoc --> execLikes
            execMessageDoc --> execComments
            execLikes --> execLikeDoc
            execComments --> execCommentDoc

            userDoc -.-> execMessageDoc
            userDoc -.-> execLikeDoc
            userDoc -.-> execCommentDoc
        end

        subgraph Videos
            direction TB
            videos["videos (collection)"]
            videoDoc["Video Document<br>{videoId}<br>uploaderId: {userId}"]

            videoLikes["likes (subcollection)"]
            videoLikeDoc["Like Document<br>{userId}"]
            
            videoComments["comments (subcollection)"]
            videoCommentDoc["Comment Document<br>{commentId}<br>authorId: {userId}"]

            videos --> videoDoc
            videoDoc --> videoLikes
            videoDoc --> videoComments
            videoLikes --> videoLikeDoc
            videoComments --> videoCommentDoc

            userDoc -.-> videoDoc
            userDoc -.-> videoLikeDoc
            userDoc -.-> videoCommentDoc
        end

    end

    style execMessages fill:#FFCA28,stroke:#333,stroke-width:2px
    style videos fill:#FFCA28,stroke:#333,stroke-width:2px
    style usersCollection fill:#FFCA28,stroke:#333,stroke-width:2px

    style execMessageDoc fill:#CFD8DC,stroke:#333,stroke-width:1px
    style videoDoc fill:#CFD8DC,stroke:#333,stroke-width:1px
    style userDoc fill:#CFD8DC,stroke:#333,stroke-width:1px

    style execLikes fill:#B2EBF2,stroke:#333,stroke-width:1px
    style execComments fill:#B2EBF2,stroke:#333,stroke-width:1px
    style videoLikes fill:#B2EBF2,stroke:#333,stroke-width:1px
    style videoComments fill:#B2EBF2,stroke:#333,stroke-width:1px

    style execLikeDoc fill:#F1F8E9,stroke:#333,stroke-width:1px
    style execCommentDoc fill:#F1F8E9,stroke:#333,stroke-width:1px
    style videoLikeDoc fill:#F1F8E9,stroke:#333,stroke-width:1px
    style videoCommentDoc fill:#F1F8E9,stroke:#333,stroke-width:1px
```

### 図の説明

*   **黄色の箱**: トップレベルのコレクション (`users`, `executiveMessages`, `videos`) を表します。
*   **グレーの箱**: 個々のドキュメントを表します。`{messageId}` や `{userId}` は、実際のドキュメントIDが入る場所を示します。
*   **水色の箱**: サブコレクション (`likes`, `comments`) を表します。
*   **薄緑の箱**: サブコレクション内のドキュメントを表します。
*   **実線の矢印 (-->)**: 親から子への関係（コレクションがドキュメントを含む、ドキュメントがサブコレクションを含むなど）を示します。
*   **破線の矢印 (-.->)**: `authorId` や `userId` などのフィールドによる、ドキュメント間の参照関係を示します。

この図が、今後の開発における認識合わせの助けとなれば幸いです。
