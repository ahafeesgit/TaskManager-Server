# Local CI Setup Guide

## 🚀 Available Commands

### **Quick CI Check**

```bash
# Run the complete CI pipeline locally
./scripts/ci-check.sh

# Individual steps
npm run ci:lint     # ESLint check
npm run ci:build    # Build verification
npm run ci:audit    # Security audit
npm run ci:check    # All steps combined
```

### **VS Code Integration**

Press `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux) and type:

- **"Tasks: Run Task"** → **"CI: Full Check"** - Run complete CI pipeline
- **"Tasks: Run Task"** → **"CI: Lint"** - ESLint only
- **"Tasks: Run Task"** → **"CI: Build"** - Build only
- **"Tasks: Run Task"** → **"CI: Security Audit"** - Security check only

## 📋 What Gets Checked

| Check        | Command                        | Purpose                |
| ------------ | ------------------------------ | ---------------------- |
| **ESLint**   | `npm run lint`                 | Code quality & style   |
| **Build**    | `npm run build`                | TypeScript compilation |
| **Security** | `npm audit --audit-level=high` | Vulnerability scan     |

## ⚡ Daily Workflow

### **Before Committing:**

```bash
# Quick check (recommended)
npm run ci:check

# Or use the script
./scripts/ci-check.sh
```

### **Pre-Push Verification:**

```bash
# Clean environment test (like CI)
rm -rf node_modules package-lock.json
npm ci
npm run ci:check
```

## 🔧 Setup Git Hooks (Optional)

To automatically run checks before commits:

```bash
# Install husky
npm install --save-dev husky

# Setup pre-commit hook
npx husky add .husky/pre-commit "npm run ci:check"
```

## 🎯 CI Pipeline Equivalence

This local setup replicates your GitHub Actions CI pipeline:

- ✅ Same ESLint rules and configuration
- ✅ Same build process and TypeScript checks
- ✅ Same security audit level (high severity)
- ✅ Same Node.js version requirements

## 💡 Tips

1. **Run checks frequently** during development
2. **Fix ESLint issues** with `npm run lint` (auto-fixes many issues)
3. **Monitor build output** for TypeScript errors
4. **Address security issues** promptly with `npm audit fix`
5. **Use VS Code tasks** for integrated development experience

Your local environment now mirrors your CI pipeline! 🚀
