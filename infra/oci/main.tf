## GHOSTCLAW control-plane host on Oracle Cloud Infrastructure.
##
## Sized to sit inside the OCI Always Free allowance: one VM.Standard.A1.Flex
## (Ampere ARM) with 4 OCPU / 24 GB, which is the whole free A1 quota in a
## single instance. Free-tier A1 capacity is frequently exhausted per-AD, so
## expect "Out of host capacity" on first apply and retry, or vary the
## availability domain — that is a quota reality, not a config error.
##
## Nothing here is applied automatically. `terraform apply` provisions real,
## billable-if-you-exceed-free-tier resources and is a human-gated action.

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

## ── Network ──────────────────────────────────────────────────────────────
##
## The security posture here is deliberate and is the main thing to preserve
## if you edit this file: there is NO public ingress except SSH.
##
## Every service (Hermes dashboard, gateway, anything else) is published via
## a Cloudflare Tunnel, which dials *outbound* from the host. A tunnel needs
## no inbound port at all, so opening 80/443 here would add attack surface
## while buying nothing. Ollama in particular must stay bound to localhost —
## its API has unauthenticated model pull/delete endpoints.

resource "oci_core_vcn" "ghostclaw" {
  compartment_id = var.compartment_ocid
  display_name   = "${var.project_name}-vcn"
  cidr_blocks    = [var.vcn_cidr]
  dns_label      = "ghostclaw"
}

resource "oci_core_internet_gateway" "ghostclaw" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.ghostclaw.id
  display_name   = "${var.project_name}-igw"
  enabled        = true
}

resource "oci_core_route_table" "ghostclaw" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.ghostclaw.id
  display_name   = "${var.project_name}-rt"

  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_internet_gateway.ghostclaw.id
  }
}

resource "oci_core_security_list" "ghostclaw" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.ghostclaw.id
  display_name   = "${var.project_name}-sl"

  # Outbound is open so cloudflared can establish its tunnel and the host can
  # reach package registries and model providers.
  egress_security_rules {
    destination      = "0.0.0.0/0"
    destination_type = "CIDR_BLOCK"
    protocol         = "all"
  }

  # SSH only, and only from the operator CIDR. Leaving this at 0.0.0.0/0 puts
  # the host in every mass scanner's queue within hours.
  ingress_security_rules {
    source      = var.ssh_allowed_cidr
    source_type = "CIDR_BLOCK"
    protocol    = "6" # TCP
    description = "SSH from operator network only"

    tcp_options {
      min = 22
      max = 22
    }
  }

  # ICMP for path-MTU discovery; without it, large packets can black-hole.
  ingress_security_rules {
    source      = var.vcn_cidr
    source_type = "CIDR_BLOCK"
    protocol    = "1"
    description = "ICMP within VCN (path MTU discovery)"

    icmp_options {
      type = 3
      code = 4
    }
  }
}

resource "oci_core_subnet" "ghostclaw" {
  compartment_id             = var.compartment_ocid
  vcn_id                     = oci_core_vcn.ghostclaw.id
  display_name               = "${var.project_name}-subnet"
  cidr_block                 = var.subnet_cidr
  route_table_id             = oci_core_route_table.ghostclaw.id
  security_list_ids          = [oci_core_security_list.ghostclaw.id]
  prohibit_public_ip_on_vnic = false
  dns_label                  = "primary"
}

## ── Image ────────────────────────────────────────────────────────────────
##
## Resolved at plan time rather than pinned to an OCID, because image OCIDs
## differ per region and are replaced whenever Oracle publishes a new build.

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

## ── Instance ─────────────────────────────────────────────────────────────

resource "oci_core_instance" "ghostclaw" {
  compartment_id      = var.compartment_ocid
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[var.availability_domain_index].name
  display_name        = "${var.project_name}-host"
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
    subnet_id        = oci_core_subnet.ghostclaw.id
    assign_public_ip = true
    hostname_label   = "control"
  }

  metadata = {
    ssh_authorized_keys = file(var.ssh_public_key_path)
    user_data           = base64encode(file("${path.module}/cloud-init.yaml"))
  }

  # The boot volume is where all state lives; keep it if the instance is
  # replaced so a shape change doesn't silently discard the host's data.
  preserve_boot_volume = true

  lifecycle {
    # Oracle republishes images constantly. Without this, every plan after an
    # image refresh proposes destroying and recreating the running host.
    ignore_changes = [source_details[0].source_id]
  }
}
