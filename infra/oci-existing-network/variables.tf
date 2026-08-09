variable "tenancy_ocid" {
  description = "OCID of the tenancy (console shows tenancy 'tondhmz99')."
  type        = string
}

variable "user_ocid" {
  type = string
}

variable "fingerprint" {
  type = string
}

variable "private_key_path" {
  type    = string
  default = "~/.oci/oci_api_key.pem"
}

variable "compartment_ocid" {
  description = "Compartment holding the existing ghostclaw-vcn. The root compartment is the tenancy OCID; the console filter showed 'tondhmz99 (root)'."
  type        = string
}

variable "region" {
  description = <<-EOT
    OCI region. The console reads 'Singapore West (Singapore)'.

    VERIFY the exact slug before apply — 'Singapore West' is most likely
    ap-singapore-2, while plain 'Singapore' is ap-singapore-1. Confirm in the
    console region menu (Profile > Tenancy shows the home region) rather than
    guessing, since an image lookup in the wrong region returns nothing.
  EOT
  type        = string
}

variable "existing_vcn_name" {
  description = "Display name of the hand-built VCN to attach to."
  type        = string
  default     = "ghostclaw-vcn"
}

variable "existing_subnet_name" {
  description = "Display name of the existing public subnet."
  type        = string
  default     = "ghostclaw-public-subnet"
}

variable "instance_name" {
  type    = string
  default = "ghostclaw-control"
}

variable "ssh_public_key_path" {
  description = "PUBLIC key (.pub). Generate a fresh keypair for this host; do not reuse the leaked one."
  type        = string
  default     = "~/.ssh/oracle_key.pub"
}

variable "instance_shape" {
  type    = string
  default = "VM.Standard.A1.Flex"
}

variable "instance_ocpus" {
  type    = number
  default = 4
}

variable "instance_memory_gb" {
  type    = number
  default = 24
}

variable "boot_volume_gb" {
  type    = number
  default = 100

  validation {
    condition     = var.boot_volume_gb >= 50 && var.boot_volume_gb <= 200
    error_message = "Boot volume must be 50-200 GB (Always Free block-storage total is 200 GB)."
  }
}

variable "ubuntu_version" {
  type    = string
  default = "22.04"
}

variable "availability_domain_index" {
  description = "Zero-based AD index. Bump to 1/2 if apply fails with 'Out of host capacity' — free A1 capacity runs out per AD."
  type        = number
  default     = 0
}
