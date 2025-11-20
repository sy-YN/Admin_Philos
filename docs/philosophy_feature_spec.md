# 「理念・ビジョン」表示機能 実装仕様書 (従業員向けアプリ)

## 1. 概要

このドキュメントは、従業員向けアプリケーションに、管理画面で設定された会社の「企業理念・ビジョン」や「考え方の継承（バリュー）」を表示するための、データ取得および画面表示ロジックの仕様を定義します。

## 2. データベース設計

本機能は、Firestoreの`philosophy`コレクションに保存されたデータを参照します。

*   **コレクションパス**: `/philosophy`
*   **ドキュメントID**: 自動生成

### 2.1. ドキュメントの構造

各ドキュメントは、一つの理念項目を表します。

```typescript
// Firestore内のドキュメントの型定義
type PhilosophyItem = {
  id: string;          // ドキュメントID
  title: string;       // 項目のタイトル (例: "企業理念")
  content: string;     // 項目の詳細な内容
  icon: string;        // 表示に使用するLucideアイコンの名前 (例: "Building2")
  category: 'mission_vision' | 'values'; // 表示カテゴリを決定するキー
  order: number;       // カテゴリ内での表示順序（昇順）
  createdAt: Timestamp; // 作成日時
  updatedAt: Timestamp; // 最終更新日時
};
```

### 2.2. フィールド詳細

| フィールド名 | 型       | 説明                                                                                             | 例                                   |
| :----------- | :------- | :----------------------------------------------------------------------------------------------- | :----------------------------------- |
| `title`      | `string` | 項目の見出し。                                                                                   | `"コーポレートステートメント"`       |
| `content`    | `string` | 項目の本文。改行は`\n`として保存されます。                                                       | `"情報技術で笑顔を創る知的集団"`     |
| `icon`       | `string`| [Lucide](https://lucide.dev/)アイコンライブラリのアイコン名。クライアント側で動的に表示します。 | `"Rocket"`                           |
| `category`   | `string` | ドキュメントがどちらのグループに属するかを定義します。                                           | `"mission_vision"` または `"values"` |
| `order`      | `number` | 各カテゴリ内での表示順を決定する数値。小さい順に表示されます。                                   | `0`, `1`, `2`...                     |

---

## 3. データ取得と表示ロジック

### 3.1. データ取得

1.  `philosophy`コレクション全体を、**`order`フィールドの昇順**で取得します。
2.  リアルタイムでの更新を反映するため、`onSnapshot`リスナーを使用することが推奨されます。

```javascript
// データ取得クエリの例
import { collection, query, orderBy } from 'firebase/firestore';

const philosophyQuery = query(collection(db, 'philosophy'), orderBy('order'));
```

### 3.2. 画面表示ロジック

取得したドキュメントの配列を、クライアント側で`category`フィールドの値に基づいて2つのグループに振り分け、それぞれ対応するUIコンポーネントに渡して描画します。

1.  **「理念・ビジョン」セクション**:
    *   `category`が`"mission_vision"`であるドキュメントのみをフィルタリングします。
    *   フィルタリングされた配列を`order`順にループさせ、`icon`, `title`, `content`を表示します。
2.  **「考え方の継承」セクション**:
    *   `category`が`"values"`であるドキュメントのみをフィルタリングします。
    *   同様に、`order`順にループさせて各項目を表示します。

```mermaid
graph TD
    subgraph "クライアントアプリ"
        A[Firestoreからデータを取得<br>query(collection(...), orderBy('order'))] --> B{全項目リスト};
        B --> C{categoryで分岐};
        C -- "mission_vision" --> D[「理念・ビジョン」<br>セクションに表示];
        C -- "values" --> E[「考え方の継承」<br>セクションに表示];
    end

    subgraph "Firestore"
        F(("/philosophy"))
    end
    
    F -.-> A;
```

この仕様に基づき、従業員がいつでも会社の理念や行動指針を確認できる画面を実装してください。
