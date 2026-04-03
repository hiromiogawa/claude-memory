# Branch protection requires GitHub Pro for private repositories.
# This configuration is kept for reference but is not applied.
# To enable, upgrade to GitHub Pro or make the repository public.
#
# resource "github_branch_protection" "main" {
#   repository_id = github_repository.claude_memory.node_id
#   pattern       = "master"
#
#   required_pull_request_reviews {
#     required_approving_review_count = 1
#     dismiss_stale_reviews           = true
#   }
#
#   required_status_checks {
#     strict = true
#     contexts = [
#       "lint",
#       "test",
#     ]
#   }
#
#   enforce_admins = false
#
#   allows_force_pushes = false
#   allows_deletions    = false
# }
