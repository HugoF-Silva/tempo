terraform {
  backend "local" {
    path = "../bootstrap/terraform.tfstate"
  }
}