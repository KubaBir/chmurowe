# frozen_string_literal: true
# -*- mode: ruby -*-
# vi: set ft=ruby :

# Sieć prywatna VirtualBox: host komunikuje się z VM po 192.168.56.x
# Tylko frontend ma forwarded_port (Vite) — DB i API bez wystawienia portów na hosta.
VAGRANTFILE_API_VERSION = "2"

ANSIBLE_VARS = {
  db_private_ip: "192.168.56.10",
  backend_private_ip: "192.168.56.11",
  frontend_private_ip: "192.168.56.12",
  postgres_user: "spotify",
  postgres_password: "spotify",
  postgres_db: "spotify_db",
  private_subnet_cidr: "192.168.56.0/24",
}.freeze

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|
  config.vm.box = "ubuntu/jammy64"

  config.vm.provider "virtualbox" do |vb|
    vb.linked_clone = true
  end

  config.vm.define "db" do |db|
    db.vm.hostname = "db"
    db.vm.network "private_network", ip: ANSIBLE_VARS[:db_private_ip]

    db.vm.provider "virtualbox" do |vb|
      vb.memory = 1024
      vb.cpus = 1
      vb.name = "chmurowe-db"
    end

    db.vm.provision "ansible" do |ansible|
      ansible.playbook = "ansible/playbooks/db.yml"
      ansible.extra_vars = ANSIBLE_VARS
    end
  end

  config.vm.define "backend" do |be|
    be.vm.hostname = "backend"
    be.vm.network "private_network", ip: ANSIBLE_VARS[:backend_private_ip]

    be.vm.provider "virtualbox" do |vb|
      vb.memory = 1024
      vb.cpus = 1
      vb.name = "chmurowe-backend"
    end

    be.vm.provision "ansible" do |ansible|
      ansible.playbook = "ansible/playbooks/backend.yml"
      ansible.extra_vars = ANSIBLE_VARS
    end
  end

  config.vm.define "frontend" do |fe|
    fe.vm.hostname = "frontend"
    fe.vm.network "private_network", ip: ANSIBLE_VARS[:frontend_private_ip]
    fe.vm.network "forwarded_port", guest: 5173, host: 5173, host_ip: "127.0.0.1"

    fe.vm.provider "virtualbox" do |vb|
      vb.memory = 1536
      vb.cpus = 2
      vb.name = "chmurowe-frontend"
    end

    fe.vm.provision "ansible" do |ansible|
      ansible.playbook = "ansible/playbooks/frontend.yml"
      ansible.extra_vars = ANSIBLE_VARS
    end
  end
end
