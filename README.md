# TaskManager Server

A NestJS-based REST API server for task management with user authentication and role-based access control.

## 🚀 Features

- **User Management**: Registration, authentication with JWT
- **Role-based Access**: Admin, task_logger, project_owner roles
- **Secure Authentication**: JWT tokens, bcrypt password hashing
- **API Documentation**: Swagger/OpenAPI integration
- **Database**: PostgreSQL with Prisma ORM
- **Security**: Helmet, compression, rate limiting
- **Development**: Hot reload, ESLint, Prettier

## 🛠 Tech Stack

- **Framework**: NestJS (Node.js)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT, Passport
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest, Supertest
- **Code Quality**: ESLint, Prettier, TypeScript

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- PostgreSQL database

## 🔧 Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/ahafeesgit/TaskManager-Server.git
   cd TaskManager-Server
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**

   Create a `.env` file in the root directory:

   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/taskmanager_db?schema=public"

   # JWT
   JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

   # Server
   PORT=3000
   ```

4. **Database Setup**

   ```bash
   # Generate Prisma client
   npx prisma generate

   # Run database migrations
   npx prisma migrate dev

   # (Optional) Seed the database
   npx prisma db seed
   ```

## 🚀 Running the Application

### Development Mode

```bash
npm run start:dev
```

### Production Mode

```bash
npm run build
npm run start:prod
```

### Debug Mode

```bash
npm run start:debug
```

## 📖 API Documentation

Once the server is running, access the Swagger documentation at:

```
http://localhost:3000/api
```

## 🧪 Testing

### Run unit tests

```bash
npm run test
```

### Run e2e tests

```bash
npm run test:e2e
```

### Run tests with coverage

```bash
npm run test:cov
```

### Run tests in watch mode

```bash
npm run test:watch
```

## 📁 Project Structure

```
src/
├── auth/              # Authentication module
├── users/             # User management module
├── prisma/            # Prisma service
├── app.controller.ts  # Main app controller
├── app.module.ts      # Main app module
└── main.ts           # Application entry point

prisma/
├── schema.prisma     # Database schema
└── migrations/       # Database migrations

test/
└── app.e2e-spec.ts  # End-to-end tests
```

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### User Roles

- **admin**: Full system access
- **project_owner**: Project management access
- **task_logger**: Basic task logging access

## 📊 API Endpoints

### Authentication

- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user profile (protected)

### Users

- `GET /users` - Get all users (admin only)
- `GET /users/:id` - Get user by ID
- `POST /users` - Create new user
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user

## 🔧 Development Scripts

```bash
npm run build        # Build the application
npm run start        # Start the application
npm run start:dev    # Start in development mode
npm run start:debug  # Start in debug mode
npm run start:prod   # Start in production mode
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:cov     # Run tests with coverage
npm run test:e2e     # Run e2e tests
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the UNLICENSED License.

## 👨‍💻 Author

**ahafeesgit** - [GitHub Profile](https://github.com/ahafeesgit)

## 📞 Support

For support, please create an issue in the GitHub repository.
