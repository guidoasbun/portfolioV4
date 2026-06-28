output "zone_id" {
  description = "Route 53 hosted zone ID"
  value       = data.aws_route53_zone.main.zone_id
}

output "apex_fqdn" {
  description = "FQDN of the apex domain record"
  value       = aws_route53_record.apex.fqdn
}

output "www_fqdn" {
  description = "FQDN of the www domain record"
  value       = aws_route53_record.www.fqdn
}
