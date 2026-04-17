provider "google" {
  project = var.project_id
  region  = var.region
}

data "google_compute_network" "default" {
  name = "default"
}

resource "google_compute_firewall" "chmurowe_ssh" {
  name    = "${var.instance_name}-ssh"
  network = data.google_compute_network.default.name

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = [var.ssh_cidr]
  target_tags   = ["chmurowe-ssh"]
}

resource "google_compute_firewall" "chmurowe_http" {
  name    = "${var.instance_name}-http"
  network = data.google_compute_network.default.name

  allow {
    protocol = "tcp"
    ports    = ["80"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["chmurowe-http"]
}

resource "google_compute_instance" "app" {
  name         = var.instance_name
  machine_type = var.machine_type
  zone         = var.zone

  tags = ["chmurowe-http", "chmurowe-ssh"]

  boot_disk {
    initialize_params {
      image = "ubuntu-os-cloud/ubuntu-2204-lts"
      size  = 30
    }
  }

  network_interface {
    network = data.google_compute_network.default.name
    access_config {}
  }

  metadata = {
    enable-oslogin = "TRUE"
  }

  scheduling {
    preemptible = false
  }
}
