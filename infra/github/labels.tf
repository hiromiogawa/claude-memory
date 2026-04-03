locals {
  labels = {
    epic    = { color = "7057ff", description = "大きな機能単位の目標" }
    task    = { color = "0075ca", description = "技術的な実装作業" }
    story   = { color = "008672", description = "ユーザー視点の機能要求" }
    bug     = { color = "d73a4a", description = "不具合報告" }
    subtask = { color = "bfd4f2", description = "Taskをさらに分解した作業単位" }
  }
}

resource "github_issue_labels" "claude_memory" {
  repository = github_repository.claude_memory.name

  dynamic "label" {
    for_each = local.labels
    content {
      name        = label.key
      color       = label.value.color
      description = label.value.description
    }
  }
}
