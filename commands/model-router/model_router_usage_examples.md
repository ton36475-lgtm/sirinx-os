# Model Router Usage Examples

## T1 small patch

```txt
/hermes-route
project: sirinx-public
tier: T1
goal: add unit test for /health worker route
constraints: no deploy, no push, no secrets
```

Expected route:
```txt
laguna_free_coder → Validator → Receipt
```

## T2 feature slice

```txt
/hermes-route
project: cloudflare-workers-backend
tier: T2
goal: implement /quote schema validator only
constraints: no CRM storage, no production deploy
```

Expected route:
```txt
qwen3_coder_free → Codex peer review → Validator → Receipt
```

## T3 architecture

```txt
/hermes-route
project: hermes-image-factory
tier: T3
goal: design budget/rate guard for image queue
constraints: no limit bypass, no account rotation
```

Expected route:
```txt
deepseek_architect + Codex peer → Fable/Hermes synthesize → Receipt
```
