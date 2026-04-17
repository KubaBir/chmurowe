output "instance_name" {
  value       = google_compute_instance.app.name
  description = "GCE instance name for gcloud compute ssh"
}

output "instance_zone" {
  value       = var.zone
  description = "Zone passed to Terraform (for gcloud compute ssh --zone=...)"
}

output "instance_external_ip" {
  value       = google_compute_instance.app.network_interface[0].access_config[0].nat_ip
  description = "Public IP — use in Ansible inventory and open http://IP in browser"
}
