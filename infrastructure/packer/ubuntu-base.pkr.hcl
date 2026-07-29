packer {
  required_plugins {
    amazon = { version = ">= 1.2.0", source = "github.com/hashicorp/amazon" }
  }
}
source "amazon-ebs" "ubuntu" {
  ami_name      = "gistpin-ubuntu-cis-{{isotime | clean_resource_name}}"
  instance_type = "t3.medium"
  region        = "us-east-1"
  source_ami_filter {
    filters = { name = "ubuntu/images/hvm-ssd/ubuntu-24.04-amd64-server-*", root-device-type = "ebs", virtualization-type = "hvm" }
    most_recent = true
    owners = ["099720109477"]
  }
  ssh_username = "ubuntu"
}
build {
  sources = ["source.amazon-ebs.ubuntu"]
  provisioner "shell" {
    script = "provisioners/hardening.sh"
  }
  provisioner "shell" {
    inline = ["apt-get update", "apt-get install -y docker.io kubectl awscli", "apt-get clean"]
  }
}
