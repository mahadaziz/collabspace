variable "region" {
  description = "AWS region for all bootstrap resources."
  type        = string
  default     = "us-east-2"
}

variable "project_name" {
  description = "Short identifier used as a prefix for resource names."
  type        = string
  default     = "collabspace"
}

variable "github_repo" {
  description = "GitHub repository in OWNER/REPO form. Used to scope the OIDC trust policy so only this repo's workflows can assume the deploy role."
  type        = string
  default     = "mahadaziz/collabspace"

  validation {
    condition     = can(regex("^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$", var.github_repo))
    error_message = "github_repo must be in OWNER/REPO form."
  }
}
