# 「階層型 組織選択コンポーネント」実装仕様書 (Organization Picker)

## 1. 概要

このドキュメントは、親子関係を持つ組織データを、展開・折りたたみ可能なツリー形式で表示・選択するためのReactコンポーネント `OrganizationPicker` の技術的な仕様と利用方法を定義します。

このコンポーネントは、Shadcn UIのコンポーネント群（Popover, Button, Collapsibleなど）を組み合わせて構築されており、再利用性と拡張性の高い設計となっています。

### 機能的特徴

-   **階層表示**: `parentId`を持つフラットな組織リストから、動的にツリー構造を構築して表示します。
-   **展開・折りたたみ**: 各階層のノード（組織）は、クリックで子要素の表示・非表示を切り替えられます。
-   **検索機能**: 入力されたキーワードに一致する組織名をリアルタイムで絞り込み、フラットなリストとして表示します。
-   **選択状態の表示**: 現在選択されている項目は、トリガーとなるボタンに表示され、リスト内でもハイライトされます。
-   **項目の無効化**: `disabled`プロパティに関数を渡すことで、特定の条件（例: `type`が`company`であるなど）に一致する組織を選択不可（グレーアウト）にできます。

## 2. ファイル構成

このコンポーネントは、以下の単一ファイルで構成されています。

-   **パス**: `src/components/organization/organization-picker.tsx`

## 3. データモデル

コンポーネントは、以下の`Organization`型の配列をデータソースとして受け取ります。

```typescript
// src/types/organization.ts

export type Organization = {
  id: string;          // 組織の一意なID
  name: string;        // 組織名
  type: string;        // 組織の種別 (例: 'holding', 'company', 'department')
  parentId: string | null; // 親組織のID。トップレベルの場合はnull
  order: number;       // 兄弟要素内での表示順
  // ... その他のフィールド
};
```

## 4. コンポーネントのProps (API)

`OrganizationPicker`コンポーネントは、以下のPropsを受け取ります。

| Prop名              | 型                                 | 必須 | デフォルト値                      | 説明                                                                                                                 |
| ------------------- | ---------------------------------- | :--: | --------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `organizations`     | `Organization[]`                   |  ✓   |                                   | 表示するすべての組織データの配列。                                                                                   |
| `value`             | `string`                           |  ✓   |                                   | 現在選択されている組織の`id`。                                                                                       |
| `onChange`          | `(value: string) => void`          |  ✓   |                                   | ユーザーが項目を選択したときに呼び出されるコールバック関数。選択された組織の`id`が引数として渡されます。             |
| `placeholder`       | `string`                           |      | `'組織を選択...'`                 | 何も選択されていないときにトリガーボタンに表示されるテキスト。                                                       |
| `searchPlaceholder` | `string`                           |      | `'組織を検索...'`                 | ドロップダウン内の検索入力欄に表示されるプレースホルダー。                                                           |
| `emptyResultText`   | `string`                           |      | `'組織が見つかりません。'`         | 検索結果が0件の場合に表示されるテキスト。                                                                            |
| `className`         | `string`                           |      |                                   | トリガーボタンに適用される追加のCSSクラス。                                                                          |
| `disabled`          | `boolean` or `(org: Organization) => boolean` |   | `false`                           | コンポーネント全体、または特定の組織を選択不可にするための設定。関数を渡した場合、各組織が引数となり、`true`を返すとその組織が選択不可になります。 |

## 5. 実装例

以下は、このコンポーネントをページに実装する際の基本的なコード例です。

```tsx
'use client';

import { useState } from 'react';
import { OrganizationPicker } from '@/components/organization/organization-picker';
import type { Organization } from '@/types/organization';

// Sample data (実際にはFirestoreなどから取得)
const sampleOrgs: Organization[] = [
  { id: '1', name: 'SYSホールディングス', type: 'holding', parentId: null, order: 0, ... },
  { id: '2', name: 'エスワイシステム', type: 'company', parentId: '1', order: 0, ... },
  { id: '3', name: 'SYS本社管理本部', type: 'department', parentId: '2', order: 0, ... },
  // ... more organizations
];

function MyPage() {
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');

  return (
    <div className="w-80">
      <OrganizationPicker
        organizations={sampleOrgs}
        value={selectedOrgId}
        onChange={setSelectedOrgId}
        placeholder="対象組織を選択"
        // 例: 'holding'と'company'タイプの組織を選択不可にする
        disabled={(org) => org.type === 'holding' || org.type === 'company'}
      />
    </div>
  );
}
```

## 6. 依存ライブラリ

このコンポーネントは、以下のライブラリ・コンポーネントに依存しています。再利用する際は、これらのコンポーネントがプロジェクトに導入されていることを確認してください。

-   `react`
-   `lucide-react` (アイコン)
-   `@/lib/utils` (`cn`関数)
-   `@/components/ui/button`
-   `@/components/ui/popover`
-   `@/components/ui/collapsible`
-   `@/components/ui/input`
-   `@/components/ui/scroll-area`
