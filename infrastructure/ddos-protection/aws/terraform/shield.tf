# AWS Shield Advanced Configuration (Optional - requires subscription)
#
# AWS Shield Standard is automatically enabled for all AWS customers at no charge.
# Shield Advanced provides additional DDoS protection and costs $3,000/month.
#
# Uncomment the resources below to enable Shield Advanced.

# # Enable Shield Advanced for ALB
# resource "aws_shield_protection" "alb" {
#   name         = "${var.app_name}-alb-protection"
#   resource_arn = aws_lb.main.arn
#
#   tags = {
#     Name        = "${var.app_name}-alb-shield"
#     Environment = var.environment
#   }
# }

# # Enable Shield Advanced for CloudFront (if using)
# resource "aws_shield_protection" "cloudfront" {
#   name         = "${var.app_name}-cloudfront-protection"
#   resource_arn = aws_cloudfront_distribution.main.arn
#
#   tags = {
#     Name        = "${var.app_name}-cloudfront-shield"
#     Environment = var.environment
#   }
# }

# # Enable Shield Advanced for Route53 Hosted Zone
# resource "aws_shield_protection" "route53" {
#   name         = "${var.app_name}-route53-protection"
#   resource_arn = aws_route53_zone.main.arn
#
#   tags = {
#     Name        = "${var.app_name}-route53-shield"
#     Environment = var.environment
#   }
# }

# # DDoS Response Team (DRT) access
# resource "aws_shield_drt_access_role_arn_association" "main" {
#   role_arn = aws_iam_role.drt_access.arn
# }

# # IAM role for DRT
# resource "aws_iam_role" "drt_access" {
#   name = "${var.app_name}-drt-access"
#
#   assume_role_policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [
#       {
#         Action = "sts:AssumeRole"
#         Effect = "Allow"
#         Principal = {
#           Service = "drt.shield.amazonaws.com"
#         }
#       }
#     ]
#   })
#
#   tags = {
#     Name        = "${var.app_name}-drt-access"
#     Environment = var.environment
#   }
# }

# # Attach managed policy for DRT
# resource "aws_iam_role_policy_attachment" "drt_access" {
#   role       = aws_iam_role.drt_access.name
#   policy_arn = "arn:aws:iam::aws:policy/service-role/AWSShieldDRTAccessPolicy"
# }

# CloudWatch alarm for DDoS attacks
resource "aws_cloudwatch_metric_alarm" "ddos_attack" {
  alarm_name          = "${var.app_name}-ddos-attack-detected"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "DDoSDetected"
  namespace           = "AWS/DDoSProtection"
  period              = "60"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "Alert when DDoS attack is detected"
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.security_alerts.arn]

  tags = {
    Name        = "${var.app_name}-ddos-alarm"
    Environment = var.environment
  }
}

# SNS topic for security alerts
resource "aws_sns_topic" "security_alerts" {
  name = "${var.app_name}-security-alerts"

  tags = {
    Name        = "${var.app_name}-security-alerts"
    Environment = var.environment
  }
}

# SNS topic subscription (email)
resource "aws_sns_topic_subscription" "security_alerts_email" {
  topic_arn = aws_sns_topic.security_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

variable "alert_email" {
  description = "Email address for security alerts"
  type        = string
  default     = "admin@example.com"
}
