################################################################################
# Route 53 Hosted Zone (data source - zone already exists)
################################################################################

data "aws_route53_zone" "main" {
  name         = var.domain_name
  private_zone = false
}

################################################################################
# A Record - Apex domain (guido-asbun.com) → ALB
################################################################################

resource "aws_route53_record" "apex" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

################################################################################
# A Record - www subdomain (www.guido-asbun.com) → ALB
################################################################################

resource "aws_route53_record" "www" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "www.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}
