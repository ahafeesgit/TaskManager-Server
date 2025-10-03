# 🎯 Using This Repository as a Template

## Overview

This repository is designed as a **production-ready template** for creating new NestJS projects with enterprise-grade DevOps, security, and automation configurations. It provides everything needed to start a new project with best practices built-in.

## 🚀 Quick Template Setup

### 1. Create New Repository from Template

#### Option A: GitHub UI

1. Click **"Use this template"** button on the repository page
2. Select **"Create a new repository"**
3. Fill in your new repository details:
   - Repository name: `your-new-project`
   - Description: `Your project description`
   - Choose public/private visibility
4. Click **"Create repository from template"**

#### Option B: GitHub CLI

```bash
gh repo create your-new-project --template ahafeesgit/TaskManager-Server --public
cd your-new-project
```

#### Option C: Git Clone

```bash
git clone https://github.com/ahafeesgit/TaskManager-Server.git your-new-project
cd your-new-project
rm -rf .git
git init
git remote add origin https://github.com/yourusername/your-new-project.git
```

### 2. Customize Project Configuration

#### A. Update Package Information

Edit `package.json`:

```json
{
  "name": "your-new-project",
  "version": "1.0.0",
  "description": "Your project description",
  "author": "Your Name <your.email@example.com>",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/yourusername/your-new-project.git"
  },
  "bugs": {
    "url": "https://github.com/yourusername/your-new-project/issues"
  },
  "homepage": "https://github.com/yourusername/your-new-project#readme"
}
```

#### B. Update GitHub Workflow Configurations

1. **Update Dependabot Assignees** - `.github/dependabot.yml`:

   ```yaml
   reviewers:
     - 'yourusername' # Replace 'ahafeesgit'
   assignees:
     - 'yourusername' # Replace 'ahafeesgit'
   ```

2. **Update Workflow Documentation** - Replace references to original repository in:
   - All files in `readme/` folder
   - `README.md` main file

#### C. Update Repository URLs

Update all references to the original repository:

```bash
# Find all references to update
grep -r "ahafeesgit/TaskManager-Server" .
grep -r "TaskManager-Server" .

# Update in files:
# - README.md
# - readme/*.md
# - package.json
# - Any other configuration files
```

### 3. Customize for Your Domain

#### A. Database Schema

Edit `prisma/schema.prisma` for your domain model:

```prisma
// Example: Change from User management to your domain
model Product {
  id          Int      @id @default(autoincrement())
  name        String
  description String?
  price       Float
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

#### B. API Modules

Update/replace the example modules:

```bash
# Remove example modules if not needed
rm -rf src/users/
rm -rf src/auth/  # If you want different auth

# Create your domain modules
npx nest generate module products
npx nest generate controller products
npx nest generate service products
```

#### C. Environment Configuration

Update `.env.example` with your environment variables:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/your_project_db?schema=public"

# JWT
JWT_SECRET="your-unique-super-secret-jwt-key"

# API
PORT=3000
API_PREFIX=api/v1

# Your custom environment variables
THIRD_PARTY_API_KEY=your_api_key
REDIS_URL=redis://localhost:6379
```

## 🛠 Development Setup After Template Use

### 1. Initial Setup

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your actual configuration

# Set up database
npx prisma generate
npx prisma migrate dev --name init
```

### 2. Verify All Systems Work

```bash
# Test the build
npm run build

# Run linting
npm run lint

# Run tests
npm run test

# Start development server
npm run start:dev
```

### 3. Test GitHub Workflows

```bash
# Create a test branch (tests branch naming)
git checkout -b feature/test-template-setup

# Make a small change and push
echo "# Test" >> TEST.md
git add .
git commit -m "test: verify template setup"
git push origin feature/test-template-setup

# Create PR to test workflows
# Go to GitHub and create PR: feature/test-template-setup → dev
```

## 📁 Template Structure Overview

### What's Included

```
🎯 Your New Project
├── 📄 README.md                    # Template-ready main documentation
├── 📁 .github/                     # Complete DevOps automation
│   ├── 📁 workflows/               # CI/CD pipelines
│   │   ├── ci-security-pipeline.yml # Code quality + security
│   │   └── branch-naming.yml       # Branch naming enforcement
│   └── dependabot.yml              # Automated dependency updates
├── 📁 readme/                      # Comprehensive documentation
│   ├── GITHUB-WORKFLOWS-OVERVIEW.md # All workflow documentation
│   ├── CI-SECURITY-PIPELINE.md     # Detailed CI/CD guide
│   ├── BRANCH-NAMING-WORKFLOW.md   # Branch naming guide
│   ├── DEPENDABOT-CONFIGURATION.md # Dependency management
│   ├── DEPLOYMENT.md               # Production deployment
│   ├── DEVELOPMENT.md              # Local development setup
│   ├── LOCAL-CI-SETUP.md           # Run CI locally
│   ├── PORT-MANAGEMENT-GUIDE.md    # Port conflict resolution
│   └── API.md                      # API documentation template
├── 📁 src/                         # Application code (customizable)
├── 📁 prisma/                      # Database configuration
├── 📁 test/                        # Testing setup
└── 📦 Configuration files          # ESLint, TypeScript, etc.
```

### What's Pre-Configured

- ✅ **Complete CI/CD** - Automated testing, building, security scanning
- ✅ **Code Quality** - ESLint, Prettier, TypeScript strict mode
- ✅ **Security** - CodeQL analysis, dependency scanning, Dependabot
- ✅ **Database** - PostgreSQL with Prisma ORM setup
- ✅ **Authentication** - JWT-based auth with role-based access
- ✅ **Testing** - Jest unit tests and e2e testing framework
- ✅ **Documentation** - Comprehensive guides for all aspects
- ✅ **Development Tools** - VS Code tasks, debugging, hot reload

## 🔧 Common Customizations

### 1. Change Database Provider

```prisma
// In prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"     // Change from "postgresql"
  url      = env("DATABASE_URL")
}
```

### 2. Add Additional Workflows

Create `.github/workflows/deployment.yml`:

```yaml
name: Deploy to Production
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # Add your deployment steps
```

### 3. Customize Dependabot Schedule

```yaml
# In .github/dependabot.yml
schedule:
  interval: 'daily' # Change from 'weekly'
  time: '10:00' # Change from '02:00'
  timezone: 'America/New_York' # Add timezone
```

### 4. Add More Package Managers

```yaml
# Add to .github/dependabot.yml
updates:
  - package-ecosystem: 'docker'
    directory: '/'
    schedule:
      interval: 'weekly'
```

### 5. Modify Branch Protection

For repositories created from this template, configure branch protection:

```yaml
# GitHub Repository Settings → Branches → Add rule
Branch name pattern: dev
☑ Require status checks to pass before merging
☑ Require branches to be up to date before merging
Required status checks:
  - Lint, Build & Security Scan
  - Check Branch Name
☑ Restrict pushes that create files in these paths:
  - .github/workflows/
```

## 📚 Documentation Maintenance

### Update Documentation for Your Project

1. **Replace Examples** - Change TaskManager examples to your domain
2. **Update API Documentation** - Modify `readme/API.md` for your endpoints
3. **Customize Deployment** - Update `readme/DEPLOYMENT.md` for your infrastructure
4. **Add Domain-Specific Guides** - Create additional documentation as needed

### Keep Documentation Current

```bash
# Regular maintenance tasks
1. Update package versions in documentation
2. Sync workflow examples with actual files
3. Add new features to documentation
4. Review and update external links
```

## 🎯 Success Checklist

After setting up your new project from this template:

### Immediate Setup (Day 1)

- [ ] Repository created from template
- [ ] Package.json updated with your project details
- [ ] Dependabot assignees updated to your username
- [ ] Environment variables configured
- [ ] Database schema customized for your domain
- [ ] First successful build and test run

### First Week

- [ ] All GitHub workflows tested and passing
- [ ] Domain-specific modules created
- [ ] API endpoints updated for your use case
- [ ] Documentation updated to reflect your project
- [ ] Team members added with proper permissions

### Production Ready

- [ ] Security settings reviewed and configured
- [ ] Deployment pipeline tested
- [ ] Monitoring and logging configured
- [ ] Performance testing completed
- [ ] Documentation comprehensive and current

## 🚨 Common Issues and Solutions

### 1. Workflow Permissions Error

```
Error: Resource not accessible by integration
```

**Solution:** Go to Repository Settings → Actions → General → Workflow permissions → Select "Read and write permissions"

### 2. CodeQL Analysis Fails

```
Error: CodeQL analysis failed to start
```

**Solution:** Ensure your repository has code files. Empty repositories may fail CodeQL initialization.

### 3. Dependabot Not Running

```
Dependabot updates not appearing
```

**Solution:**

- Check `.github/dependabot.yml` syntax
- Verify you have package.json in root directory
- Ensure repository permissions allow Dependabot

### 4. Branch Naming Workflow False Positives

```
Branch name validation failing incorrectly
```

**Solution:** Check regex pattern in `.github/workflows/branch-naming.yml` and ensure branch name follows required format.

## 🔗 Helpful Resources

### Template Maintenance

- [GitHub Template Repositories](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-template-repository)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Dependabot Configuration Reference](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates)

### NestJS Development

- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

### DevOps & Security

- [GitHub Security Features](https://docs.github.com/en/code-security)
- [CodeQL Documentation](https://codeql.github.com/docs/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

## 💡 Pro Tips

### 1. Template Updates

Periodically sync your projects with template updates:

```bash
# Add original template as upstream
git remote add template https://github.com/ahafeesgit/TaskManager-Server.git
git fetch template

# Merge specific updates (carefully!)
git cherry-pick <commit-hash>
```

### 2. Multi-Environment Setup

Extend the template for staging/production:

```bash
# Create environment-specific branches
git checkout -b staging
git checkout -b production

# Update workflows for environment-specific deployments
```

### 3. Team Onboarding

Use this template for consistent team projects:

- Share template link with team
- Create organization-specific fork
- Add team-specific customizations
- Document organization standards

This template provides everything needed to start a professional NestJS project with enterprise-grade DevOps in minutes! 🚀
