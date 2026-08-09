## Compute-only Terraform that attaches to the ALREADY-CREATED GhostClaw network.
##
## Context: the OCI console shows ghostclaw-vcn (10.0.0.0/16),
## ghostclaw-public-subnet and ghostclaw-igw already built by hand in the
## Singapore West tenancy. The greenfield config in ../oci creates its own VCN;
## running it here would produce a *second*, parallel network. Use this module
## instead — it looks the existing network up by name and adds only the A1
## instance, so nothing already built is touched or duplicated.
##
## Still human-gated: terraform apply provisions a real instance.

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 6.0"
    }
  }
}

provider "oci" {
  tenancy_ocid     = var.tenancy_ocid
  user_ocid        = var.user_ocid
  fingerprint      = var.fingerprint
  private_key_path = var.private_key_path
  region           = var.region
}

## ── Look up the existing, hand-built network by display name ──────────────
##
## Matching on the names visible in the console rather than pinning OCIDs, so
## this keeps working if a resource is recreated with the same name.

data "oci_core_vcns" "existing" {
  compartment_id = var.compartment_ocid
  display_name   = var.existing_vcn_name
}

data "oci_core_subnets" "existing" {
  compartment_id = var.compartment_ocid
  vcn_id         = data.oci_core_vcns.existing.virtual_networks[0].id
  display_name   = var.existing_subnet_name
}

## Add SSH ingress to the existing subnet's security list only if it isn't
## already there is a manual step — this module does not mutate the existing
## security list, to avoid changing rules you set by hand. See README.

data "oci_identity_availability_domains" "ads" {
  compartment_id = var.tenancy_ocid
}

data "oci_core_images" "ubuntu_arm" {
  compartment_id           = var.compartment_ocid
  operating_system         = "Canonical Ubuntu"
  operating_system_version = var.ubuntu_version
  shape                    = var.instance_shape
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"
}

## ── The instance ─────────────────────────────────────────────────────────

resource "oci_core_instance" "ghostclaw" {
  compartment_id      = var.compartment_ocid
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[var.availability_domain_index].name
  display_name        = var.instance_name
  shape               = var.instance_shape

  shape_config {
    ocpus         = var.instance_ocpus
    memory_in_gbs = var.instance_memory_gb
  }

  source_details {
    source_type             = "image"
    source_id               = data.oci_core_images.ubuntu_arm.images[0].id
    boot_volume_size_in_gbs = var.boot_volume_gb
  }

  create_vnic_details {
    subnet_id        = data.oci_core_subnets.existing.subnets[0].id
    assign_public_ip = true
    hostname_label   = "control"
  }

  metadata = {
    ssh_authorized_keys = file(var.ssh_public_key_path)
    # Reuse the cloud-init from the greenfield module — same host provisioning.
    user_data = base64encode(file("${path.module}/../oci/cloud-init.yaml"))
  }

  preserve_boot_volume = true

  lifecycle {
    ignore_changes = [source_details[0].source_id]
  }
}
