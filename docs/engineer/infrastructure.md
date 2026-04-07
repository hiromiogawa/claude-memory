# インフラ管理（Terraform）

GitHub リポジトリの設定を Terraform で管理している。

## 管理対象

| リソース | ファイル | 内容 |
|----------|----------|------|
| リポジトリ設定 | `infra/github/main.tf` | visibility, マージ戦略, topics |
| ブランチ保護 | `infra/github/branch-protection.tf` | PRレビュー, CI必須チェック (lint, test) |
| ラベル | `infra/github/labels.tf` | epic, task, story, bug, subtask |

## 前提条件

- Terraform CLI >= 1.14.0
- GitHub Personal Access Token（`repo` の Full control 権限）

### トークンの作成手順

1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. `Generate new token (classic)` をクリック
3. スコープ: `repo`（Full control of private repositories）にチェック
4. 生成されたトークンを控える（再表示不可）

## セットアップ

```bash
cd infra/github
terraform init
```

## 実行手順

### 差分確認（plan）

```bash
terraform plan -var="github_token=ghp_xxxxx"
```

### 適用（apply）

```bash
terraform apply -var="github_token=ghp_xxxxx"
```

> トークンをシェル履歴に残したくない場合は環境変数を使う:
>
> ```bash
> export TF_VAR_github_token="ghp_xxxxx"
> terraform plan
> terraform apply
> ```

## tfstate の管理方針

現在は **ローカル管理**（`terraform.tfstate` をリポジトリに含む）。

- このリポジトリは個人プロジェクトであり、同時編集のリスクがないためローカル管理で十分
- チーム開発に移行する場合は S3 + DynamoDB 等のリモートバックエンドを検討する

## CI/CD からの自動適用

現時点では未導入。手動で `plan` → `apply` を実行する運用。

導入する場合の検討事項:

- GitHub Actions で PR 時に `terraform plan` を自動実行
- main マージ時に `terraform apply` を自動実行
- トークンは GitHub Actions Secrets に格納
