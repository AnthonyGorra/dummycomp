# AWS Security Groups for Network Segmentation
# Terraform configuration for VPC security groups

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "crm-app"
}

variable "environment" {
  description = "Environment"
  type        = string
  default     = "production"
}

variable "vpn_cidr" {
  description = "VPN CIDR block"
  type        = string
  default     = "10.8.0.0/24"
}

# Security Group for Application Load Balancer (Public)
resource "aws_security_group" "alb" {
  name        = "${var.app_name}-${var.environment}-alb-sg"
  description = "Security group for Application Load Balancer"
  vpc_id      = var.vpc_id

  # HTTP from anywhere (redirects to HTTPS)
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP from anywhere"
  }

  # HTTPS from anywhere
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS from anywhere"
  }

  # Outbound to application servers only
  egress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
    description     = "To application servers"
  }

  tags = {
    Name        = "${var.app_name}-alb-sg"
    Environment = var.environment
    Layer       = "public"
  }
}

# Security Group for Application Servers (Private)
resource "aws_security_group" "app" {
  name        = "${var.app_name}-${var.environment}-app-sg"
  description = "Security group for application servers"
  vpc_id      = var.vpc_id

  # Inbound from ALB only
  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
    description     = "From ALB"
  }

  # Inbound from bastion (VPN) for SSH
  ingress {
    from_port       = 22
    to_port         = 22
    protocol        = "tcp"
    security_groups = [aws_security_group.bastion.id]
    description     = "SSH from bastion"
  }

  # Outbound to database
  egress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.database.id]
    description     = "To PostgreSQL database"
  }

  # Outbound to Redis
  egress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.redis.id]
    description     = "To Redis cache"
  }

  # Outbound to internet (for external API calls)
  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS to internet"
  }

  egress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP to internet"
  }

  tags = {
    Name        = "${var.app_name}-app-sg"
    Environment = var.environment
    Layer       = "application"
  }
}

# Security Group for Database (Isolated)
resource "aws_security_group" "database" {
  name        = "${var.app_name}-${var.environment}-db-sg"
  description = "Security group for PostgreSQL database"
  vpc_id      = var.vpc_id

  # Inbound from application servers only
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
    description     = "PostgreSQL from app servers"
  }

  # Inbound from bastion (for maintenance)
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.bastion.id]
    description     = "PostgreSQL from bastion"
  }

  # NO outbound internet access
  # Only allow responses to ingress

  tags = {
    Name        = "${var.app_name}-db-sg"
    Environment = var.environment
    Layer       = "database"
  }
}

# Security Group for Redis Cache (Isolated)
resource "aws_security_group" "redis" {
  name        = "${var.app_name}-${var.environment}-redis-sg"
  description = "Security group for Redis cache"
  vpc_id      = var.vpc_id

  # Inbound from application servers only
  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
    description     = "Redis from app servers"
  }

  # Inbound from bastion (for maintenance)
  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.bastion.id]
    description     = "Redis from bastion"
  }

  # NO outbound internet access

  tags = {
    Name        = "${var.app_name}-redis-sg"
    Environment = var.environment
    Layer       = "cache"
  }
}

# Security Group for Bastion Host (VPN Access)
resource "aws_security_group" "bastion" {
  name        = "${var.app_name}-${var.environment}-bastion-sg"
  description = "Security group for bastion host"
  vpc_id      = var.vpc_id

  # VPN access only
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.vpn_cidr]
    description = "SSH from VPN"
  }

  # Outbound to application servers
  egress {
    from_port       = 22
    to_port         = 22
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
    description     = "SSH to app servers"
  }

  # Outbound to database
  egress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.database.id]
    description     = "PostgreSQL to database"
  }

  # Outbound to Redis
  egress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.redis.id]
    description     = "Redis to cache"
  }

  tags = {
    Name        = "${var.app_name}-bastion-sg"
    Environment = var.environment
    Layer       = "management"
  }
}

# Outputs
output "alb_security_group_id" {
  description = "ALB Security Group ID"
  value       = aws_security_group.alb.id
}

output "app_security_group_id" {
  description = "Application Security Group ID"
  value       = aws_security_group.app.id
}

output "database_security_group_id" {
  description = "Database Security Group ID"
  value       = aws_security_group.database.id
}

output "redis_security_group_id" {
  description = "Redis Security Group ID"
  value       = aws_security_group.redis.id
}

output "bastion_security_group_id" {
  description = "Bastion Security Group ID"
  value       = aws_security_group.bastion.id
}
