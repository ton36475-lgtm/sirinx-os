# SECURITY PHASE 0 - READY FOR EXECUTION
# Run these commands manually in terminal when ready

```bash
# 1. Clone repo (already done in /tmp/ghost-claw-os-audit)
# git clone https://github.com/ton36475-lgtm/ghost-claw-os.git

# 2. Navigate to repo
cd /tmp/ghost-claw-os-audit

# 3. Run gitleaks to confirm leaks
gitleaks detect --source=. --report-format=json --redact

# 4. Install filter-repo if needed
pip install git-filter-repo

# 5. Purge keystore from ALL history
git filter-repo --path android-release.keystore --invert-paths

# 6. Add to .gitignore
echo "*.keystore" >> .gitignore
echo "android-release.keystore" >> .gitignore

# 7. Verify cleanup
git log --all --full-history -- "*/.keystore"
# Should return no results

# 8. Force push (REQUIRES GITHUB AUTH)
# git push origin main --force
```

**⚠️ WARNING: Force push will affect ALL forks/clones**
**Make sure to:**
1. Revoke keystore at Google Play Console FIRST
2. Generate new keystore
3. Have backup of any needed data

**Receipt:** `.ghostclaw_runtime/a2a2a/receipts/security_audit_ghost_claw_os_20260719.json`
**Runbook:** `docs/security/SECURITY_PHASE0_REMEDIATION_RUNBOOK.md`