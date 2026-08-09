output "public_ip" {
  value = oci_core_instance.ghostclaw.public_ip
}

output "ssh_command" {
  description = "Ubuntu images log in as 'ubuntu'."
  value       = "ssh -i ${replace(var.ssh_public_key_path, ".pub", "")} ubuntu@${oci_core_instance.ghostclaw.public_ip}"
}

output "attached_vcn" {
  value = data.oci_core_vcns.existing.virtual_networks[0].display_name
}

output "post_apply_note" {
  value = <<-EOT

    Instance created and attached to the existing ${var.existing_vcn_name}.

    One thing this module deliberately did NOT do: it did not edit the
    existing subnet's security list, since you configured that by hand. If SSH
    times out, the hand-built security list probably has no rule for port 22
    from your address. Add one in the console (Networking > VCN >
    ghostclaw-public-subnet's security list) scoped to your own IP as /32 —
    not 0.0.0.0/0.

    Then follow ../oci/outputs.tf's cloudflared / Cloudflare Access steps, and
    keep Ollama (11434) off the tunnel.
  EOT
}
