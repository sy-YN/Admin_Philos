# 「目標設定」機能 DB設計図

このドキュメントは、提案された「目標設定」機能のFirestoreデータベース構造を視覚的に示したものです。
「会社」「組織」「個人」のすべての目標を単一の `goals` コレクションに集約し、各ドキュメントに持たせた `scope` と `scopeId` フィールドによって、それらを識別・関連付ける設計案です。

```mermaid
graph TD
    subgraph "Firestore Database"
        direction LR

        %% Collections %%
        UsersCollection["users (collection)"]
        GoalsCollection["goals (collection)"]
        KpiCollection["kpiDefinitions (collection)"]

        %% Documents %%
        UserDoc["User Document<br>{userId}<br><b>department: '営業部'</b><br><b>company: 'A社'</b>"]
        
        CompanyGoalDoc["Goal Document (会社目標)<br>id: {goal_01}<br><b>scope: 'company'</b><br><b>scopeId: 'A社'</b>"]
        DeptGoalDoc["Goal Document (部署目標)<br>id: {goal_02}<br><b>scope: 'department'</b><br><b>scopeId: '営業部'</b>"]
        PersonalGoalDoc["Goal Document (個人目標)<br>id: {goal_03}<br><b>scope: 'personal'</b><br><b>scopeId: '{userId}'</b>"]

        KpiDoc["KPI Definition Document<br>{kpi_A}<br><b>companyId: 'A社'</b>"]
        
        %% Relationships %%
        UsersCollection --> UserDoc
        GoalsCollection --> CompanyGoalDoc
        GoalsCollection --> DeptGoalDoc
        GoalsCollection --> PersonalGoalDoc
        KpiCollection --> KpiDoc
    end

    %% Styling %%
    style UsersCollection fill:#FFCA28,stroke:#333
    style GoalsCollection fill:#FFCA28,stroke:#333
    style KpiCollection fill:#FFCA28,stroke:#333

    style UserDoc fill:#CFD8DC,stroke:#333
    style CompanyGoalDoc fill:#E8EAF6,stroke:#333
    style DeptGoalDoc fill:#E8EAF6,stroke:#333
    style PersonalGoalDoc fill:#E8EAF6,stroke:#333
    style KpiDoc fill:#E8EAF6,stroke:#333
    
    %% Explicit Links to explain relationships %%
    UserDoc -->|<b>scopeId</b>で参照| PersonalGoalDoc
    UserDoc -->|<b>department</b>が一致| DeptGoalDoc
    UserDoc --x|<b>companyId</b>で参照| KpiDoc
    UserDoc --x|<b>company</b>が一致| CompanyGoalDoc

    subgraph "凡例"
        direction LR
        box1["fa:fa-folder コレクション"]
        box2["fa:fa-file-alt ドキュメント"]
        box3["--- 参照/関連"]
    end
```

### 図の説明

*   **`users` (コレクション)**
    *   ユーザー情報を管理します。各ユーザーは、自分がどの「部署」や「会社」に所属しているかという情報を持っています。
*   **`kpiDefinitions` (コレクション)**
    *   会社ごとに設定できるKPIの選択肢を管理します。（例：「A社」では「契約数」と「顧客満足度」が選べる）
*   **`goals` (コレクション)**
    *   これが私たちの提案の核となる、**すべての目標をまとめた大きな箱**です。
    *   **会社目標**: `scope`が`'company'`、`scopeId`が会社名（例: `'A社'`）になります。
    *   **部署目標**: `scope`が`'department'`、`scopeId`が部署名（例: `'営業部'`）になります。
    *   **個人目標**: `scope`が`'personal'`、`scopeId`が個人のID（`'{userId}'`）になります。この`scopeId`が、`users`コレクションの各ユーザーに直接リンクします。

### 「部署メンバーの個人目標」を取得する流れ（図での見方）

1.  アプリで「営業部」が選択されると、まず`users`コレクションを見て、`department`が`'営業部'`のユーザーを探します (図の`User Document`が該当)。
2.  次に、`goals`コレクションに対し、「`scope`が`'personal'`で、かつ`scopeId`が1で見つかったユーザーのIDと一致するもの」を探します。
3.  これにより、`PersonalGoalDoc`が取得でき、画面に表示される、という流れになります。

この図によって、全体の構造がより明確になれば幸いです。