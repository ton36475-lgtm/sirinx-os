import json
import sys

SENSITIVE = (
    "apikey",
    "api_key",
    "token",
    "secret",
    "password",
    "authorization",
    "cookie",
    "clientsecret",
    "client_secret",
)

def redact(value):
    if isinstance(value, dict):
        output = {}
        for key, item in value.items():
            normalized = key.lower().replace("-", "_")
            if any(word in normalized for word in SENSITIVE):
                output[key] = "[REDACTED]"
            else:
                output[key] = redact(item)
        return output

    if isinstance(value, list):
        return [redact(item) for item in value]

    return value

try:
    document = json.load(sys.stdin)
except Exception as exc:
    print(json.dumps({
        "error": "Unable to parse resolved config as JSON",
        "detail": str(exc)
    }, indent=2))
    raise SystemExit(1)

print(json.dumps(redact(document), indent=2, ensure_ascii=False))
