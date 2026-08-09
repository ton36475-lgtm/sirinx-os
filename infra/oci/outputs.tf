output "public_ip" {
  description = "Public IP of the control-plane host."
  value       = oci_core_instance.ghostclaw.public_ip
}

output "ssh_command" {
  description = "Ready-to-paste SSH command. Ubuntu images use the 'ubuntu' user; 'opc' is Oracle Linux only."
  value       = "ssh -i ${replace(var.ssh_public_key_path, ".pub", "")} ubuntu@${oci_core_instance.ghostclaw.public_ip}"
}

output "instance_ocid" {
  description = "OCID of the instance, for OCI CLI commands."
  value       = oci_core_instance.ghostclaw.id
}

output "next_steps" {
  description = "What still needs a human after apply succeeds."
  value       = <<-EOT

    The host is up but publishes nothing yet. That is intentional — the
    security list allows no inbound traffic except SSH from your own CIDR.

    Remaining steps, each of which needs a decision or a secret and so is
    deliberately not automated here:

      1. cloudflared tunnel login          — opens a browser, authorises the cert
      2. cloudflared tunnel create ghostclaw
      3. Map hostnames in the tunnel config, then run it as a systemd service.
         Do NOT route Ollama (11434) through the tunnel: its API exposes
         unauthenticated model pull and delete.
      4. Put Cloudflare Access in front of any hostname that can approve a
         Red-tier action, since reaching that URL is equivalent to approving.

    Treat ~/.cloudflared/cert.pem as a password once step 1 completes.
  EOT
}
