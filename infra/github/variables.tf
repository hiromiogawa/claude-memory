variable "github_token" {
  description = "GitHub personal access token"
  type        = string
  sensitive   = true
}

variable "github_owner" {
  description = "GitHub owner (user or org)"
  type        = string
  default     = "hiromiogawa"
}

variable "repository_name" {
  description = "Repository name"
  type        = string
  default     = "claude-memory"
}
