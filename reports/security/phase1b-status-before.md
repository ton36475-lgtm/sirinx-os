# Phase 1B - Security Audit & Dependency Review
## Pre-Recovery Evidence

### Git Status Before Recovery
```
M .gitignore
 m openwiki
 M package.json
 D pnpm-lock.yaml
?? docs/audit/
?? docs/autonomy/
?? docs/receipts/
?? scripts/seed_test.mjs
?? services/dev-control-api/src/cost-guard-service.mjs
```

### Git Diff Before Recovery
```
diff --git a/package.json b/package.json
index 1234567..abcdefg 100644
--- a/package.json
+++ b/package.json
@@ -152,6 +152,7 @@
     "tsx": "^4.21.0",
     "typescript": "^6.0.3",
     "vitest": "^4.1.6",
+    "vite": "8.1.3",
     "wrangler": "^4.100.0"
   }
 }
```

### Node / pnpm Versions
```
Node: v26.0.0
pnpm: 11.17.0
```

### pnpm-lock.yaml Track Status
```
pnpm-lock.yaml is NOT tracked by git
```