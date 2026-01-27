
# 多機能サイドメニュー 実装仕様書（権限チェックなし版）

## 1. 概要

このドキュメントは、アプリケーションの主要なナビゲーション機能を提供する、高機能なサイドメニューコンポーネントの構造と実装ロジックについて定義します。

このコンポーネントは、通常の展開された状態と、アイコンのみの折りたたみ状態の2つの表示モードを持ち、レスポンシブで直感的なユーザー体験を提供します。

---

## 2. 機能要件

-   **表示モードの切り替え**: メニューは「展開状態」と「折りたたみ状態」を切り替えることができます。
-   **階層メニュー**: メニュー項目は子メニューを持つことができ、複数の階層を表現できます。
-   **動的なサブメニュー表示**:
    -   **展開時**: 子メニューはアコーディオン形式で親メニューの下にインラインで表示されます。
    -   **折りたたみ時**: 子メニューは親メニューのアイコンをクリック（またはホバー）すると、ポップオーバー形式で横に表示されます。
-   **ツールチップ**: 折りたたみ時には、各アイコンにカーソルを合わせると、メニューのラベルがツールチップとして表示されます。
-   **アクティブ状態のハイライト**: 現在表示しているページに対応するメニュー項目は、背景色を変えるなどして視覚的にハイライトされます。

---

## 3. データ構造 (メニュー項目の定義方法)

サイドメニューに表示する項目は、以下のような型のオブジェクト配列として定義します。これにより、メニューの構造をデータとして一元管理できます。

```typescript
// メニュー項目を表す型定義
type NavItem = {
  id: string;          // 各項目を一意に識別するためのID
  href: string;        // リンク先のURLパス
  label: string;       // メニューに表示されるテキスト
  icon: React.FC<any>; // 表示するアイコンコンポーネント (例: Lucide Reactのアイコン)
  children?: Omit<NavItem, 'icon' | 'children'>[]; // 子メニューの配列 (オプション)
};

// 実装例
const menuItems: NavItem[] = [
  { href: '/home', label: 'ホーム', icon: Home, id: 'home' },
  {
    href: '/settings',
    label: '設定',
    icon: Settings,
    id: 'settings',
    children: [
      { href: '/settings/profile', label: 'プロフィール', id: 'profile' },
      { href: '/settings/account', label: 'アカウント', id: 'account' },
    ],
  },
  { href: '/about', label: '概要', icon: Info, id: 'about' },
];
```

---

## 4. コンポーネント構成と主要ライブラリ

このサイドメニューは、主に以下のコンポーネントとライブラリを組み合わせて構築します。

-   **主要コンポーネント (Shadcn UI)**
    -   `Button`: 各メニュー項目やトリガーボタン。
    -   `Accordion`: 展開時の階層メニュー表示用。
    -   `Popover`: 折りたたみ時の階層メニュー表示用。
    -   `Tooltip`: 折りたたみ時のアイコンラベル表示用。
    -   `Avatar`: ユーザープロフィールの表示用。
    -   `Separator`: 区切り線。
-   **アイコン**: `lucide-react`
-   **Hooks (React / Next.js)**
    -   `useState`: メニューの展開・折りたたみ状態 (`isCollapsed`) を管理。
    -   `usePathname`, `useSearchParams`: 現在のURLパスを取得し、アクティブなリンクを判定。

---

## 5. 主要ロジック解説

### 5.1. 開閉ロジック

-   メニューのコンポーネント内に、`const [isCollapsed, setIsCollapsed] = useState(false);` のようにして状態を定義します。
-   開閉を制御するボタンの `onClick` イベントで `setIsCollapsed(!isCollapsed)` を呼び出し、状態を切り替えます。
-   コンポーネントのルート要素の `className` に、`isCollapsed` の状態に応じて幅を変化させるCSSクラス（例: `w-72` と `w-20`）を動的に適用します。

### 5.2. 表示切り替えロジック

-   `isCollapsed` の状態を判定し、三項演算子などを用いて表示する内容を切り替えます。

```tsx
// 擬似コード
{isCollapsed ? (
  // 折りたたみ時のUI (TooltipとPopoverを使用)
  <TooltipProvider>
    {menuItems.map(item => (
      // ...
    ))}
  </TooltipProvider>
) : (
  // 展開時のUI (Accordionを使用)
  <Accordion type="single" collapsible>
    {menuItems.map(item => (
      // ...
    ))}
  </Accordion>
)}
```

### 5.3. アクティブリンクの判定

-   Next.jsの `usePathname()` と `useSearchParams()` を使って現在のURL情報を取得します。
-   メニュー項目をループで描画する際に、各項目の `href` と現在のパスを比較し、一致または前方一致する場合にアクティブと判定します。
-   `cn` ユーティリティ関数を使い、アクティブな項目に特定のCSSクラス（例: `bg-muted`）を適用してハイライトします。

```tsx
// 擬似コード
const pathname = usePathname();
const isActive = item.children 
    ? pathname.startsWith(item.href) 
    : pathname === item.href;

<Link 
    href={item.href} 
    className={cn(
        '...', 
        isActive && 'bg-muted text-primary' // アクティブ時のスタイル
    )}
>
    {/* ... */}
</Link>
```

---

この仕様書を基に、再利用可能でメンテナンス性の高いサイドメニューコンポーネントを実装してください。
