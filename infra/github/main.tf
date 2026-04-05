provider "github" {
  token = var.github_token
  owner = var.github_owner
}

resource "github_repository" "claude_memory" {
  name        = var.repository_name
  description = "Long-term memory MCP Server for Claude Code — hybrid search with pgvector + pg_bigm"
  visibility  = "public"

  has_issues   = true
  has_projects = true
  has_wiki     = false

  allow_merge_commit = false
  allow_squash_merge = true
  allow_rebase_merge = false

  delete_branch_on_merge = true

  topics = ["claude-code", "mcp-server", "long-term-memory", "typescript", "pgvector", "clean-architecture"]
}
