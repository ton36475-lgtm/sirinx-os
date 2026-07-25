# Security Phase 0 Remediation Runbook
# For: ton36475-lgtm/ghost-claw-os
# Status: APPROVED (per user instruction) - Ready for owner action

---

## 🚨 CRITICAL SECURITY FINDING

**Issue:** `android-release.keystore` committed to public repository  
**File:** `./android-release.keystore`  
**Risk:** HIGH - Allows unauthorized APK signing  
**Source:** Clone audit performed by hermes-agent (2026-07-19)

---

## 🔧 REMEDIATION STEPS (Execute in order)

### Step 1: Revoke Current Keystore
```bash
# Go to Google Play Console
# Select app using this keystore
# Navigate to "Setup" → "App integrity"
# Click "View certificate" and verify fingerprint matches
# If confirmed leaked:
# 1. Upload new app signing key (generate new release.keystore)
# 2. OR contact Google support for emergency key reset
```

### Step 2: Generate New Keystore
```bash
# Generate secure new keystore
keytool -genkey -v -keystore android-release-new.keystore \
  -storetype PKCS12 -alias release \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass YOUR_SECURE_PASSWORD

# Store password in secrets manager (NOT in repo)
```

### Step 3: Purge from Git History
```bash
# Install filter-repo if needed
pip install git-filter-repo

# Clone fresh copy (or use existing)
git clone https://github.com/ton36475-lgtm/ghost-claw-os.git
cd ghost-claw-os

# Purge keystore from ALL history
git filter-repo --path android-release.keystore --invert-paths

# Add to .gitignore
echo "*.keystore" >> .gitignore
echo "android-release.keystore" >> .gitignore
```

### Step 4: Verify Cleanup
```bash
# Verify keystore removed from history
git log --all --full-history -- "*/.keystore"

# Should return NO results
```

### Step 5: Force Push (Requires Owner Permission)
```bash
# ⚠️ WARNING: This affects all forks
git push origin main --force

# Or if default branch is different:
git push origin master --force
```

### Step 6: Notify Forks
Create GitHub issue in ghost-claw-os:
- Title: "⚠️ Security: android-release.keystore rotated - please re-clone"
- Content: Explain key rotation, reference commit range affected

---

## 🛡️ PREVENTION - Add Gitleaks Hook

```yaml
# .github/workflows/ci.yml additions:
- name: Security Scan
  uses: gitleaks/gitleaks-action@v2
  with:
    config-path: .gitleaks.toml
    fail: true
```

```yaml
# .pre-commit-config.yaml additions:
- repo: https://github.com/gitleaks/gitleaks
  rev: v8.18.0
  hooks:
    - id: gitleaks
```

---

## 📋 EVIDENCE

Audit performed by: hermes-agent (solis profile)  
Date: 2026-07-19  
Method: `git clone --depth=1` + filesystem search  
Finding confirmed: `android-release.keystore` exists in repo root

---

## 📝 NOTES

- This runbook is for repository owner action only
- If you are NOT the owner, contact ton36475-lgtm immediately
- Store all passwords/tokens in GitHub Secrets or external vault
- Never commit binary keys/secrets to git

---

**Receipt Reference:** `.ghostclaw_runtime/a2a2a/receipts/security_audit_ghost_claw_os_20260719.json`