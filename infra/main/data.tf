resource "aws_db_subnet_group" "main" {
  name        = "${var.project_name}-db"
  description = "Subnets where the RDS instance can live (single-AZ, but RDS still requires at least 2 AZs in the group)"
  subnet_ids  = aws_subnet.public[*].id

  tags = {
    Name = "${var.project_name}-db"
  }
}

resource "random_password" "db_master" {
  length  = 32
  special = true
  # RDS Postgres master password disallows /, ", @, and space.
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_db_instance" "main" {
  identifier     = var.project_name
  engine         = "postgres"
  engine_version = "16"
  instance_class = var.db_instance_class

  allocated_storage     = var.db_allocated_storage_gb
  max_allocated_storage = 0
  storage_type          = "gp3"
  storage_encrypted     = true

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db.id]
  publicly_accessible    = false
  multi_az               = false

  username = var.db_username
  password = random_password.db_master.result
  db_name  = var.db_name

  port = 5432

  backup_retention_period   = 7
  backup_window             = "07:00-08:00"
  maintenance_window        = "Sun:08:00-Sun:09:00"
  copy_tags_to_snapshot     = true
  delete_automated_backups  = true
  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.project_name}-final-${formatdate("YYYYMMDDhhmm", timestamp())}"

  deletion_protection          = true
  apply_immediately            = true
  auto_minor_version_upgrade   = true
  performance_insights_enabled = false

  lifecycle {
    ignore_changes = [
      # `timestamp()` re-evaluates every plan; we don't want a perpetual diff.
      final_snapshot_identifier,
    ]
  }

  tags = {
    Name = var.project_name
  }
}
