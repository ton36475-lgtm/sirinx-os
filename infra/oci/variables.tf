## Inputs. Real values belong in terraform.tfvars, which is git-ignored —
## see terraform.tfvars.example for the shape.

variable "tenancy_ocid" {
  description = "OCID of the tenancy (Console: Profile > Tenancy)."
  type        = string
}

variable "user_ocid" {
  description = "OCID of the API user (Console: Profile > User settings)."
  type        = string
}

variable "fingerprint" {
  description = "Fingerprint of the API signing key uploaded to that user."
  type        = string
}

variable "private_key_path" {
  description = "Path to the OCI API private key on this machine. Never commit the key itself."
  type        = string
  default     = "~/.oci/oci_api_key.pem"
}

variable "compartment_ocid" {
  description = "OCID of the compartment to build in. The tenancy OCID works as the root compartment."
  type        = string
}

variable "region" {
  description = "OCI region identifier, e.g. ap-singapore-1. Pick the one nearest your operators — free-tier A1 capacity varies a lot by region."
  type        = string
  default     = "ap-singapore-1"
}

variable "project_name" {
  description = "Name prefix applied to every resource."
  type        = string
  default     = "ghostclaw"
}

## ── Access ───────────────────────────────────────────────────────────────

variable "ssh_public_key_path" {
  description = "Path to the PUBLIC half of the SSH keypair for this host (the .pub file). Generate a fresh pair for this server rather than reusing an existing key."
  type        = string
  default     = "~/.ssh/oracle_key.pub"
}

variable "ssh_allowed_cidr" {
  description = <<-EOT
    CIDR permitted to reach port 22. Set this to your own address as /32.

    Defaulting to 0.0.0.0/0 is left deliberately un-done: an SSH port open to
    the internet is found by scanners within hours, and this host is intended
    to hold model weights and agent credentials.
  EOT
  type        = string

  validation {
    condition     = var.ssh_allowed_cidr != "0.0.0.0/0"
    error_message = "Refusing 0.0.0.0/0 for SSH. Use your own address as a /32, or a VPN range. If you genuinely need world-open SSH, remove this validation block deliberately rather than by accident."
  }
}

## ── Shape ────────────────────────────────────────────────────────────────

variable "instance_shape" {
  description = "Compute shape. VM.Standard.A1.Flex is the Ampere ARM shape covered by Always Free."
  type        = string
  default     = "VM.Standard.A1.Flex"
}

variable "instance_ocpus" {
  description = "OCPU count. Always Free grants 4 A1 OCPUs in total across all instances."
  type        = number
  default     = 4
}

variable "instance_memory_gb" {
  description = "Memory in GB. Always Free grants 24 GB in total across all A1 instances."
  type        = number
  default     = 24
}

variable "boot_volume_gb" {
  description = <<-EOT
    Boot volume size. Always Free covers 200 GB of block storage in total, and
    the boot volume counts toward it — 100 GB leaves headroom for a second
    volume or a rebuild without tipping into charges.
  EOT
  type        = number
  default     = 100

  validation {
    condition     = var.boot_volume_gb >= 50 && var.boot_volume_gb <= 200
    error_message = "Boot volume must be between 50 GB (OCI minimum) and 200 GB (Always Free total)."
  }
}

variable "ubuntu_version" {
  description = "Ubuntu release to resolve an image for."
  type        = string
  default     = "22.04"
}

variable "availability_domain_index" {
  description = <<-EOT
    Which availability domain to place the instance in, zero-based.

    Free-tier A1 capacity runs out per-AD, so an "Out of host capacity" error
    is usually solved by trying a different index rather than by changing the
    shape. Many regions expose only one AD, in which case 0 is the only valid
    value.
  EOT
  type        = number
  default     = 0
}

## ── Network ──────────────────────────────────────────────────────────────

variable "vcn_cidr" {
  description = "CIDR block for the VCN."
  type        = string
  default     = "10.10.0.0/16"
}

variable "subnet_cidr" {
  description = "CIDR block for the public subnet."
  type        = string
  default     = "10.10.1.0/24"
}
