Vagrant.configure("2") do |config|
  config.vm.box = "ubuntu/jammy64"
  config.vm.boot_timeout = 900

  configure_ansible = lambda do |machine, role|
    machine.vm.provision "ansible_local" do |ansible|
      ansible.playbook = "/vagrant/ansible/playbook.yml"
      ansible.install = true
      ansible.install_mode = "pip"
      ansible.extra_vars = {
        node_role: role,
        db_host: "192.168.56.10",
        backend_host: "192.168.56.11"
      }
    end
  end

  config.vm.define "db" do |db|
    db.vm.hostname = "db"
    db.vm.network "private_network", ip: "192.168.56.10"

    db.vm.provider "virtualbox" do |vb|
      vb.memory = 1024
      vb.cpus = 1
    end

    configure_ansible.call(db, "db")
  end

  config.vm.define "backend" do |backend|
    backend.vm.hostname = "backend"
    backend.vm.network "private_network", ip: "192.168.56.11"

    backend.vm.provider "virtualbox" do |vb|
      vb.memory = 2048
      vb.cpus = 3
    end

    configure_ansible.call(backend, "backend")
  end

  config.vm.define "frontend" do |frontend|
    frontend.vm.hostname = "frontend"
    frontend.vm.network "private_network", ip: "192.168.56.12"
    frontend.vm.network "forwarded_port", guest: 80, host: 8080, host_ip: "127.0.0.1", auto_correct: true

    frontend.vm.provider "virtualbox" do |vb|
      vb.memory = 1024
      vb.cpus = 1
    end

    configure_ansible.call(frontend, "frontend")
  end
end
