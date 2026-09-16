# Severity Policy

| Severity | Definition | Default Gate |
|---|---|---|
| `S0` | Active compromise, unauthorized external effect, or severe safety breach | `NO_GO` and panic stop |
| `S1` | Critical journey unavailable, authz bypass, material data exposure, or irreversible corruption | `NO_GO` |
| `S2` | Major functional, accessibility, performance, privacy, or claim defect without safe workaround | `NO_GO` unless an eligible exact waiver exists |
| `S3` | Bounded defect with a documented workaround and no critical-journey breach | May be `CONDITIONAL_GO` with a valid waiver |
| `S4` | Minor cosmetic or documentation defect | Track; does not automatically block |

`BLOCKED` and `UNVERIFIED` are evidence states, not severities, and are not
waivable.
