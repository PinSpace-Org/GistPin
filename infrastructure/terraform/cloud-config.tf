terraform {
  cloud {
    organization = "gistpin"
    workspaces {
      tags = ["gistpin", "production", "staging"]
    }
  }
}
