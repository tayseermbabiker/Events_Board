# Workflow Rules for UAE Events Platform

## Git & GitHub Rules

### ⚠️ CRITICAL RULE: NEVER Push Without Approval

**BEFORE any `git push` command:**
1. ✅ Show the user what changes were made
2. ✅ Explain what will be pushed
3. ✅ Wait for explicit approval from user
4. ✅ ONLY THEN push to GitHub

**Never auto-push, even if:**
- Changes seem minor
- Only updating documentation
- Fixing a small bug
- User asked to "commit" (commit ≠ push)

---

## Deployment Workflow

```
Local Changes → Git Commit → WAIT FOR APPROVAL → Git Push → Netlify Auto-Deploy
```

**Steps:**
1. Make code changes locally
2. Test changes locally if possible
3. `git add .`
4. `git commit -m "message"`
5. **STOP** - Ask user: "Ready to push to GitHub?"
6. **WAIT** for user approval
7. `git push` only after approval
8. Netlify auto-deploys from GitHub

---

## Exception

**ONLY push without asking if:**
- User explicitly says: "push to GitHub now" or "deploy it"
- User says: "push when ready"

Otherwise, always ask first.

---

**Created:** 2025-10-25
**Last Updated:** 2025-10-25
