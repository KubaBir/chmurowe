variable "project_id" {
  type        = string
  description = "GCP project ID (e.g. from gcloud config get-value project)"
}

variable "region" {
  type        = string
  description = "Region for provider default (e.g. europe-west1)"
  default     = "europe-west1"
}

variable "zone" {
  type        = string
  description = "Zone for the VM (e.g. europe-west1-b)"
  default     = "europe-west1-b"
}

variable "machine_type" {
  type        = string
  description = "e2-micro fits free tier but is tight for Postgres+Node+Nginx; use e2-small if OOM"
  default     = "e2-micro"
}

variable "ssh_cidr" {
  type        = string
  description = "CIDR allowed to SSH (restrict to your IP in production, e.g. 203.0.113.10/32)"
  default     = "0.0.0.0/0"
}

variable "instance_name" {
  type        = string
  default     = "chmurowe-app"
}
