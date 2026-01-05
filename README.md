# DevMark Backend

A scalable, enterprise-grade backend API for the DevNexus developer marketplace platform, built with Node.js, Express.js, and MongoDB following Clean Architecture principles.

## 🏗️ Architecture Overview

This project implements **Clean Architecture + Domain-Driven Design (DDD)** patterns to ensure:

- **Maintainability**: Clear separation of concerns across layers
- **Scalability**: Easy to add new features without breaking existing code
- **Testability**: Each layer can be tested independently
- **Team Collaboration**: Different developers can work on different layers simultaneously

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB 5.0+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd DevMarkBackend

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Update .env with your configuration
# Configure MongoDB, JWT secrets, email, Cloudinary, etc.

# Start development server
npm run dev
```

### Environment Setup

1. **Database Setup**
   ```bash
   # Start MongoDB
   mongod
   ```

2. **Environment Variables**
   - Copy `.env.example` to `.env`
   - Update all required configuration values
   - Generate secure JWT secrets

3. **External Services**
   - Set up Cloudinary account for file uploads
   - Configure email service (Gmail/SMTP)
   - Optional: Redis for caching

## 📁 Project Structure

```
src/
├── app/                          # Application Layer
│   ├── controllers/              # Request handlers
│   ├── middleware/               # Express middleware
│   ├── routes/                   # Route definitions
│   └── validators/               # Input validation
│
├── domain/                       # Domain Layer (Business Logic)
│   ├── entities/                 # Business entities
│   ├── repositories/             # Repository interfaces
│   ├── services/                 # Domain services
│   └── value-objects/           # Value objects
│
├── infrastructure/               # Infrastructure Layer
│   ├── database/                # MongoDB models
│   ├── repositories/            # Repository implementations
│   ├── external/                # External APIs (Cloudinary, Email)
│   └── config/                  # Configuration
│
├── shared/                      # Shared utilities
│   ├── errors/                  # Custom error classes
│   ├── utils/                   # Helper functions
│   ├── constants/               # Application constants
│   └── types/                   # TypeScript types
│
├── use-cases/                   # Application Use Cases
│   ├── auth/                    # Authentication use cases
│   ├── users/                   # User management
│   ├── projects/                # Project management
│   └── marketplace/             # Marketplace operations
│
├── tests/                       # Test files
├── scripts/                     # Utility scripts
└── docs/                        # Documentation
```

## 🔧 Technology Stack

### Core Technologies
- **Node.js + Express.js**: Web framework
- **MongoDB + Mongoose**: Database and ODM
- **TypeScript**: Type safety and better development experience

### Security & Performance
- **JWT**: Authentication and authorization
- **Bcrypt**: Password hashing
- **Helmet**: Security headers
- **Rate Limiting**: API protection
- **Compression**: Response optimization

### Development & Monitoring
- **Winston**: Structured logging
- **Jest**: Testing framework
- **ESLint + Prettier**: Code quality
- **Swagger**: API documentation

## 📚 API Documentation

Once the server is running, visit:
- **API Documentation**: `http://localhost:5000/api-docs`
- **Health Check**: `http://localhost:5000/health`

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 📜 Available Scripts

```bash
# Development
npm run dev          # Start development server with hot reload
npm start            # Start production server

# Testing
npm test             # Run all tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run format       # Format code with Prettier

# Database
npm run seed         # Seed database with sample data
npm run migrate      # Run database migrations
```

## 🔐 Security Features

- **JWT-based Authentication**: Secure token-based auth
- **Role-Based Access Control**: Granular permissions
- **Input Validation**: Comprehensive request validation
- **Rate Limiting**: Prevent API abuse
- **Security Headers**: Protection against common vulnerabilities
- **Data Sanitization**: XSS and injection prevention

## 📊 Monitoring & Logging

- **Structured Logging**: Winston-based logging with multiple levels
- **Error Tracking**: Comprehensive error handling and reporting
- **Performance Monitoring**: Request timing and database query tracking
- **Health Checks**: Application and database health monitoring

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production
```bash
# Build and start
npm start
```

### Docker (Recommended for Production)
```bash
# Build image
docker build -t devmark-backend .

# Run container
docker run -p 5000:5000 --env-file .env devmark-backend
```

## 📈 Performance Features

- **Database Indexing**: Optimized queries for common operations
- **Caching Strategy**: Redis integration for frequently accessed data
- **Compression**: Gzip compression for responses
- **Pagination**: Efficient handling of large datasets
- **Connection Pooling**: Optimized database connections

## 🔄 API Design Principles

- **RESTful Design**: Following REST conventions
- **Consistent Responses**: Standardized response format
- **Proper HTTP Status Codes**: Semantic use of HTTP status
- **Versioning**: API versioning support
- **Error Handling**: Comprehensive error responses

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 Code Standards

- **TypeScript**: Strict mode enabled
- **ESLint**: Airbnb style guide
- **Prettier**: Consistent code formatting
- **Husky**: Pre-commit hooks for code quality
- **Conventional Commits**: Standardized commit messages

## 🔍 Architecture Details

For detailed architecture information, please refer to:
- [Architecture Documentation](./ARCHITECTURE.md)
- [API Documentation](./docs/api/)
- [Database Schema](./docs/database.md)

## 📞 Support

For questions and support:
- Create an issue in the repository
- Check the documentation
- Review the FAQ section

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🎯 Next Steps

1. **Setup Environment**: Configure `.env` file
2. **Database Setup**: Start MongoDB and create database
3. **External Services**: Configure Cloudinary and email
4. **Run Development**: `npm run dev`
5. **Explore APIs**: Visit `/api-docs` for interactive documentation
6. **Run Tests**: `npm test` to verify setup

Happy coding! 🚀
