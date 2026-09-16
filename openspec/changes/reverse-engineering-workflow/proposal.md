# Proposal: Reverse Engineering Workflow Build Packet

## Summary

Create a reusable GhostClaw workflow that converts verified sources into an implementation-ready Build Packet while keeping research local-safe and policy-gated.

## Problem

Reverse engineering requests often mix source discovery, architecture inference, spec writing, and implementation. Without a packet boundary, agents can overreach into live scanning, code mutation, or unsafe external actions.

## Proposed Change

Define the Source -> Verify -> Reverse_Engineer -> Spec -> Architecture -> Knowledge_Vault -> Build_Packet -> Validate -> Receipt -> Handoff workflow with templates and validator checks.

## Non-Goals

- No live code implementation.
- No unauthorized third-party scanning.
- No credential handling.
- No customer data processing.
- No deploy, push, cloud mutation, provider call, or live send.
