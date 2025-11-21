# 「理念・ビジョン」リッチテキスト表示仕様書 (従業員向けアプリ)

## 1. 概要

このドキュメントは、管理者画面のリッチテキストエディタで作成・保存された「理念・ビジョン」のコンテンツ（HTML形式）を、従業員向けアプリケーション側で、スタイルが適用された状態で安全に表示するための実装仕様と手順を定義します。

---

## 2. データ仕様の前提

-   **データソース**: Firestore の `philosophy` コレクション。
-   **対象フィールド**: 各ドキュメント内の `content` フィールド。
-   **データ形式**: `content` フィールドには、管理者画面のTiptapエディタによって生成された、以下のような安全なHTML文字列が保存されています。
    ```html
    <p>情報技術で<b>笑顔</b>を<span style="color: #E03131">創る</span>知的集団</p>
    ```

---

## 3. 実装の基本方針

Reactの標準機能である **`dangerouslySetInnerHTML`** を使用して、文字列として保存されているHTMLをWebページ上でHTML要素として解釈・描画させます。

### 3.1. なぜ `dangerouslySetInnerHTML` を使うのか？

通常、Reactはセキュリティ上の理由から、コンポーネントに直接HTMLを埋め込むことを許可していません（クロスサイトスクリプティング攻撃を防ぐため）。しかし、`dangerouslySetInnerHTML` を使うことで、意図的にこの制限を解除し、動的なHTMLコンテンツのレンダリングが可能になります。

### 3.2. 安全性について

`dangerously` という名前がついていますが、今回のケースでは安全に使用できます。なぜなら、表示するHTMLコンテンツは、**管理者のみがアクセスできる画面**で、**機能が制限されたTiptapエディタ**を通じて生成されるためです。Tiptapエディタが不要なタグやスクリプトを自動的に除去（サニタイズ）するため、悪意のあるコードがデータベースに保存されるリスクは極めて低いです。

---

## 4. 実装手順

以下に、従業員向けアプリに「理念・ビジョン」を表示する際の具体的な作業手順を示します。

### 手順1: データ取得コンポーネントの作成

まず、Firestoreの`philosophy`コレクションからデータを取得するReactコンポーネントを作成します。`useCollection`フックなどを使用するのが効率的です。

```tsx
// 例: /app/philosophy/page.tsx (従業員向けアプリの想定)
'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { PhilosophyItem } from '@/types/philosophy';
import { collection, query, orderBy } from 'firebase/firestore';

function PhilosophyDisplay() {
  const firestore = useFirestore();
  const philosophyQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'philosophy'), orderBy('order'));
  }, [firestore]);

  const { data: items, isLoading } = useCollection<PhilosophyItem>(philosophyQuery);

  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  if (!items) {
    return <div>コンテンツがありません。</div>;
  }

  // 次のステップで作成する表示用コンポーネントを呼び出す
  return (
    <div>
      {items.map(item => (
        <PhilosophyContentViewer key={item.id} item={item} />
      ))}
    </div>
  );
}
```

### 手順2: HTML表示用コンポーネントの作成

次に、取得したHTML文字列を `dangerouslySetInnerHTML` を使って表示するコンポーネントを作成します。

```tsx
// 例: /components/philosophy/philosophy-content-viewer.tsx (従業員向けアプリの想定)
import type { PhilosophyItem } from '@/types/philosophy';
import { DynamicIcon } from './dynamic-icon'; // 管理者画面のものを再利用

interface PhilosophyContentViewerProps {
  item: PhilosophyItem;
}

export function PhilosophyContentViewer({ item }: PhilosophyContentViewerProps) {
  return (
    <div className="flex items-start gap-4 p-4 border-b">
      <DynamicIcon name={item.icon} className="h-6 w-6 text-primary" />
      <div className="flex-1">
        <h3 className="font-bold text-lg">{item.title}</h3>
        
        {/* ここが重要：HTMLを解釈して表示する部分 */}
        <div
          className="prose prose-sm dark:prose-invert max-w-none text-foreground"
          dangerouslySetInnerHTML={{ __html: item.content }}
        />
        
      </div>
    </div>
  );
}
```

### 手順3: スタイルの適用

上記のコード例のように、Tailwind CSSのタイポグラフィプラグイン（`@tailwindcss/typography`）が提供する `prose` クラスを適用することを推奨します。

`prose` クラスを付与するだけで、HTMLタグ（`<p>`, `<b>`など）に対して、読みやすく美しいデフォルトスタイル（余白、文字サイズなど）が自動的に適用され、個別にCSSを書く手間が省けます。

---

以上の手順を踏むことで、管理者画面で編集した通りのリッチなコンテンツを、従業員向けアプリで安全かつ正確に表示することができます。
