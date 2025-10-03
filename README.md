# NestJS Project Template

| A production-                                                       | Document                                                     | Description                                                                                                                                                                              |
| ------------------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [🎯 Template Usage Guide](./readme/TEMPLATE-USAGE-GUIDE.md)         | **START HERE** - Complete guide for using this as a template |
| [🔄 GitHub Workflows](./readme/GITHUB-WORKFLOWS-OVERVIEW.md)        | Complete guide to all automated workflows                    |
| [🔒 CI Security Pipeline](./readme/CI-SECURITY-PIPELINE.md)         | Detailed CI/CD and security scanning setup                   |
| [🌿 Branch Naming](./readme/BRANCH-NAMING-WORKFLOW.md)              | Automated branch naming convention enforcement               |
| [🤖 Dependabot Configuration](./readme/DEPENDABOT-CONFIGURATION.md) | Automated dependency management setup                        |
| [🚀 Deployment Guide](./readme/DEPLOYMENT.md)                       | Production deployment instructions                           |
| [⚙️ Development Setup](./readme/DEVELOPMENT.md)                     | Local development environment setup                          |
| [🔧 Local CI Setup](./readme/LOCAL-CI-SETUP.md)                     | Run CI/CD pipeline locally                                   |
| [🔌 Port Management](./readme/PORT-MANAGEMENT-GUIDE.md)             | Troubleshoot port conflicts                                  |
| [📡 API Documentation](./readme/API.md)                             | Complete API reference                                       | S template repository with comprehensive DevOps, security, and automation setup. Perfect for quickly bootstrapping new Node.js/TypeScript projects with enterprise-grade configurations. |

## 🎯 Template Overview

This repository serves as a **root template** for creating new NestJS projects with pre-configured:

- ✅ **CI/CD Pipelines** - Automated testing, building, and security scanning
- ✅ **Code Quality** - ESLint, Prettier, TypeScript strict mode
- ✅ **Security** - CodeQL analysis, dependency scanning, and Dependabot
- ✅ **Database** - PostgreSQL with Prisma ORM and migrations
- ✅ **Authentication** - JWT-based auth with role-based access control
- ✅ **Documentation** - Comprehensive guides and API documentation
- ✅ **Development Tools** - Hot reload, debugging, and testing setup

## � Features

### Core Framework

- **NestJS** - Modern Node.js framework with TypeScript
- **PostgreSQL** - Robust relational database
- **Prisma ORM** - Type-safe database access
- **JWT Authentication** - Secure user authentication

### DevOps & Automation

- **GitHub Actions** - CI/CD pipelines with security scanning
- **Dependabot** - Automated dependency updates
- **ESLint & Prettier** - Code quality and formatting
- **Jest Testing** - Unit and E2E test frameworks

### Security & Monitoring

- **CodeQL Analysis** - Advanced security scanning
- **npm audit** - Dependency vulnerability checks
- **Helmet** - Security headers middleware
- **Rate Limiting** - API protection

## 📚 Documentation

Comprehensive documentation is available in the [`readme/`](./readme/) folder:

| Document                                                            | Description                                    |
| ------------------------------------------------------------------- | ---------------------------------------------- |
| [� GitHub Workflows](./readme/GITHUB-WORKFLOWS-OVERVIEW.md)         | Complete guide to all automated workflows      |
| [🔒 CI Security Pipeline](./readme/CI-SECURITY-PIPELINE.md)         | Detailed CI/CD and security scanning setup     |
| [🌿 Branch Naming](./readme/BRANCH-NAMING-WORKFLOW.md)              | Automated branch naming convention enforcement |
| [🤖 Dependabot Configuration](./readme/DEPENDABOT-CONFIGURATION.md) | Automated dependency management setup          |
| [🚀 Deployment Guide](./readme/DEPLOYMENT.md)                       | Production deployment instructions             |
| [⚙️ Development Setup](./readme/DEVELOPMENT.md)                     | Local development environment setup            |
| [🔧 Local CI Setup](./readme/LOCAL-CI-SETUP.md)                     | Run CI/CD pipeline locally                     |
| [🔌 Port Management](./readme/PORT-MANAGEMENT-GUIDE.md)             | Troubleshoot port conflicts                    |
| [📡 API Documentation](./readme/API.md)                             | Complete API reference                         |

## 🛠 Quick Start

### 1. Use This Template

Click **"Use this template"** on GitHub or:

```bash
git clone https://github.com/ahafeesgit/TaskManager-Server.git your-new-project
cd your-new-project
```

### 2. Customize for Your Project

```bash
# 1. Update package.json
npm init  # Update name, description, version

# 2. Update repository URLs in:
# - package.json
# - README.md
# - .github/workflows/*.yml

# 3. Update database schema in prisma/schema.prisma
# 4. Update environment variables in .env.example
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your database credentials
# DATABASE_URL="postgresql://username:password@localhost:5432/your_db_name"
# JWT_SECRET="your-unique-jwt-secret"
```

### 5. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# (Optional) Seed data
npx prisma db seed
```

### 6. Run the Application

```bash
# Development mode with hot reload
npm run start:dev

# Production mode
npm run build && npm run start:prod
```

## 🔧 Development Scripts

| Command               | Description                              |
| --------------------- | ---------------------------------------- |
| `npm run start:dev`   | Start development server with hot reload |
| `npm run start:debug` | Start with debugging enabled             |
| `npm run build`       | Build production bundle                  |
| `npm run lint`        | Run ESLint code quality checks           |
| `npm run test`        | Run unit tests                           |
| `npm run test:e2e`    | Run end-to-end tests                     |
| `npm run test:cov`    | Run tests with coverage report           |

## 🏗 Project Structure

```
📁 Root Repository Structure
├── 📄 README.md                    # This template guide
├── 📁 .github/                     # GitHub configuration
│   ├── 📁 workflows/               # CI/CD pipeline definitions
│   │   ├── ci-security-pipeline.yml # Main CI/CD with security scanning
│   │   └── branch-naming.yml       # Branch naming convention enforcement
│   └── dependabot.yml              # Automated dependency updates
├── 📁 readme/                      # Comprehensive documentation
│   ├── GITHUB-WORKFLOWS-OVERVIEW.md
│   ├── CI-SECURITY-PIPELINE.md
│   ├── BRANCH-NAMING-WORKFLOW.md
│   ├── DEPENDABOT-CONFIGURATION.md
│   ├── DEPLOYMENT.md
│   ├── DEVELOPMENT.md
│   ├── LOCAL-CI-SETUP.md
│   ├── PORT-MANAGEMENT-GUIDE.md
│   └── API.md
├── 📁 src/                         # Application source code
│   ├── 📁 auth/                    # Authentication module
│   ├── 📁 users/                   # User management module
│   ├── 📁 prisma/                  # Database service
│   ├── app.module.ts               # Main application module
│   └── main.ts                     # Application entry point
├── 📁 prisma/                      # Database configuration
│   ├── schema.prisma               # Database schema definition
│   └── 📁 migrations/              # Database migration files
├── 📁 test/                        # Test files
└── 📦 Package files                # Dependencies and configuration
    ├── package.json
    ├── tsconfig.json
    ├── eslint.config.mjs
    └── nest-cli.json
```

## 🔐 Default Authentication Setup

The template includes a complete authentication system:

### User Roles

- **admin** - Full system access
- **project_owner** - Project management access
- **task_logger** - Basic task logging access

### API Endpoints

- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user profile (protected)
- `GET /users` - List users (admin only)

### Security Features

- JWT token-based authentication
- Password hashing with bcrypt
- Role-based access control
- Rate limiting and security headers

## 🤖 Automated Workflows

### CI/CD Pipeline (`ci-security-pipeline.yml`)

- **Triggers**: Pull requests to dev, pushes to dev, monthly schedule
- **Features**: ESLint, build verification, security audit, CodeQL analysis
- **Optimization**: Smart path filtering, conditional steps

### Branch Naming (`branch-naming.yml`)

- **Enforces**: `feature/`, `fix/`, `hotfix/`, `bugfix/`, `chore/`, `docs/` prefixes
- **Protects**: main, staging, dev branches
- **Provides**: Detailed error messages and correction instructions

### Dependency Management (`dependabot.yml`)

- **Schedule**: Weekly updates on Sundays at 2 AM UTC
- **Grouping**: Separate dev and production dependency updates
- **Security**: Automatic security vulnerability updates

## 🛡 Security Features

### CodeQL Analysis

- JavaScript/TypeScript security scanning
- Automated vulnerability detection
- Integration with GitHub Security tab

### Dependency Scanning

- Weekly automated dependency updates
- Security vulnerability alerts
- High-severity immediate updates

### Code Quality

- ESLint with TypeScript strict rules
- Prettier code formatting
- Pre-commit quality checks

## 🌍 Using as Template Repository

### For New Projects

1. **Click "Use this template"** on GitHub
2. **Customize** package.json, README.md, and configs
3. **Update** database schema for your domain
4. **Configure** environment variables
5. **Deploy** using the included deployment guides

### Template Benefits

- ⚡ **Instant Setup** - Skip weeks of DevOps configuration
- 🔒 **Security First** - Enterprise-grade security out of the box
- 📈 **Best Practices** - Industry-standard patterns and conventions
- 🔄 **Automated** - CI/CD, testing, and dependency management
- 📚 **Documented** - Comprehensive guides for every aspect

## 🎯 Next Steps After Using Template

1. **Follow Template Guide** - Start with [Template Usage Guide](./readme/TEMPLATE-USAGE-GUIDE.md) for step-by-step setup
2. **Read Documentation** - Review [GitHub Workflows Overview](./readme/GITHUB-WORKFLOWS-OVERVIEW.md) to understand automation
3. **Customize Business Logic** - Modify src/ folder for your domain-specific requirements
4. **Update Database Schema** - Modify prisma/schema.prisma for your data model
5. **Configure Deployment** - Follow [Deployment Guide](./readme/DEPLOYMENT.md) for production setup
6. **Set Up Development** - Use [Development Setup](./readme/DEVELOPMENT.md) for team onboarding

## 💡 Support & Contributing

### Getting Help

- 📖 **Documentation** - Check the comprehensive guides in `readme/`
- 🐛 **Issues** - Create GitHub issues for bugs or questions
- 💬 **Discussions** - Use GitHub Discussions for general questions

### Contributing to Template

1. Fork the repository
2. Follow [Branch Naming Convention](./readme/BRANCH-NAMING-WORKFLOW.md)
3. Create pull requests targeting `dev` branch
4. All PRs automatically run security and quality checks

## � License

This template is provided under the UNLICENSED license. You can modify the license for your projects.

## 👨‍💻 Template Maintainer

**ahafeesgit** - [GitHub Profile](https://github.com/ahafeesgit)

---

**Ready to build something amazing?** 🚀 Use this template and have a production-ready NestJS application with enterprise DevOps in minutes!
