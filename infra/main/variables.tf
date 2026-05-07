variable "region" {
  description = "AWS region. Must match the bootstrap module's region."
  type        = string
  default     = "us-east-2"
}

variable "project_name" {
  description = "Short identifier used as a prefix and in resource tags."
  type        = string
  default     = "collabspace"
}

variable "domain" {
  description = "Apex domain registered in Route 53. The hosted zone is referenced as a data source, not created here."
  type        = string
  default     = "collabspace.dev"
}

variable "alert_email" {
  description = "Email address that receives CloudWatch alarm notifications. AWS sends a confirmation email after first apply that you must click."
  type        = string
}

variable "ec2_instance_type" {
  description = "EC2 instance type for the application host. t3.micro is free-tier eligible for 12 months."
  type        = string
  default     = "t3.micro"
}

variable "ec2_root_volume_gb" {
  description = "Root EBS volume size in GiB. Free tier covers 30 GiB."
  type        = number
  default     = 30
}

variable "db_instance_class" {
  description = "RDS instance class. db.t3.micro is free-tier eligible for 12 months."
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage_gb" {
  description = "RDS storage in GiB. Free tier covers 20 GiB."
  type        = number
  default     = 20
}

variable "db_username" {
  description = "RDS master username."
  type        = string
  default     = "collabspace"
}

variable "db_name" {
  description = "Initial database created on the RDS instance."
  type        = string
  default     = "collabspace"
}

variable "ssh_ingress_cidr" {
  description = "CIDR allowed to reach port 22 on the EC2 instance. Leave empty to disable SSH entirely (use SSM Session Manager instead, recommended). Example: \"203.0.113.7/32\"."
  type        = string
  default     = ""
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
  default     = "10.0.0.0/16"
}
