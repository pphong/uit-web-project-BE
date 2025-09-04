# UIT Web Project Backend

Backend project với Node.js + Express + MongoDB Native Driver theo best practices.

## 🚀 Tính năng chính

- **Authentication & Authorization**: JWT-based với roles admin/user
- **User Management**: Quản lý người dùng với phân quyền
- **Wallet Management**: Quản lý nhiều ví, chuyển khoản giữa các ví
- **Expense Management**: Quản lý chi tiêu với categories và labels
- **Label Management**: Hệ thống nhãn linh hoạt cho transactions
- **Budget & Alerts**: Thiết lập ngân sách và cảnh báo chi tiêu

## 🏗️ Kiến trúc

```
src/
├── config/          # Cấu hình database, environment
├── controllers/     # Xử lý HTTP requests
├── middleware/      # Authentication, validation, logging
├── models/          # MongoDB Native Driver models
├── routes/          # API endpoints
├── services/        # Business logic
├── utils/           # Utilities (logger, response)
└── tests/           # Test files
```

## 🛠️ Công nghệ sử dụng

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB với Native Driver
- **Authentication**: JWT + bcryptjs
- **Validation**: Joi
- **Logging**: Winston
- **Security**: Helmet, CORS, Rate Limiting
- **Testing**: Jest + Supertest
- **Code Quality**: ESLint + Prettier

## 📦 Cài đặt

### Yêu cầu hệ thống
- Node.js >= 16.0.0
- MongoDB >= 4.4

### Cài đặt dependencies
```bash
npm install
```

### Cấu hình environment
Tạo file `.env` từ `.env.example`:
```bash
cp .env.example .env
```

Cập nhật các biến môi trường:
```env
# Server
NODE_ENV=development
PORT=3000
API_VERSION=v1

# MongoDB
MONGODB_URI=mongodb://localhost:27017/uit-web-project

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=30d

# Security
BCRYPT_SALT_ROUNDS=12
SESSION_SECRET=your-session-secret
```

## 🚀 Chạy ứng dụng

### Development mode
```bash
npm run dev
```

### Production mode
```bash
npm start
```

### Testing
```bash
npm test
```

### Linting & Formatting
```bash
npm run lint
npm run format
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Đăng ký người dùng
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/refresh-token` - Làm mới token
- `POST /api/auth/logout` - Đăng xuất
- `GET /api/auth/profile` - Lấy thông tin profile
- `PUT /api/auth/profile` - Cập nhật profile
- `PUT /api/auth/change-password` - Đổi mật khẩu

### User Management (Admin only)
- `GET /api/users` - Lấy danh sách người dùng
- `GET /api/users/:userId` - Lấy thông tin người dùng
- `PUT /api/users/:userId` - Cập nhật người dùng
- `DELETE /api/users/:userId` - Xóa người dùng
- `PUT /api/users/:userId/activate` - Kích hoạt người dùng
- `PUT /api/users/:userId/deactivate` - Vô hiệu hóa người dùng

### Wallet Management
- `GET /api/wallets` - Lấy danh sách ví
- `POST /api/wallets` - Tạo ví mới
- `GET /api/wallets/:walletId` - Lấy thông tin ví
- `PUT /api/wallets/:walletId` - Cập nhật ví
- `DELETE /api/wallets/:walletId` - Xóa ví
- `POST /api/wallets/transfer` - Chuyển tiền giữa các ví

### Expense Management
- `GET /api/expenses` - Lấy danh sách chi tiêu
- `POST /api/expenses` - Tạo chi tiêu mới
- `GET /api/expenses/:expenseId` - Lấy thông tin chi tiêu
- `PUT /api/expenses/:expenseId` - Cập nhật chi tiêu
- `DELETE /api/expenses/:expenseId` - Xóa chi tiêu

### Label Management
- `GET /api/labels` - Lấy danh sách nhãn
- `POST /api/labels` - Tạo nhãn mới
- `GET /api/labels/:labelId` - Lấy thông tin nhãn
- `PUT /api/labels/:labelId` - Cập nhật nhãn
- `DELETE /api/labels/:labelId` - Xóa nhãn

## 🗄️ Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  email: String (unique),
  password: String (hashed),
  firstName: String,
  lastName: String,
  role: String (enum: ['user', 'admin']),
  isActive: Boolean,
  isEmailVerified: Boolean,
  preferences: Object,
  createdAt: Date,
  updatedAt: Date
}
```

### Wallets Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: users),
  name: String,
  balance: Number,
  currency: String,
  description: String,
  color: String,
  icon: String,
  isDefault: Boolean,
  isActive: Boolean,
  settings: Object,
  lastTransactionAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Expenses Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: users),
  walletId: ObjectId (ref: wallets),
  amount: Number,
  description: String,
  category: String,
  labels: [String],
  date: Date,
  location: Object,
  receipt: String,
  notes: String,
  isRecurring: Boolean,
  recurringDetails: Object,
  splitDetails: Object,
  status: String,
  tags: [String],
  createdAt: Date,
  updatedAt: Date
}
```

### Labels Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: users),
  name: String,
  color: String,
  description: String,
  icon: String,
  isActive: Boolean,
  isDefault: Boolean,
  usageCount: Number,
  lastUsedAt: Date,
  metadata: Object,
  createdAt: Date,
  updatedAt: Date
}
```

## 🔐 Authentication & Authorization

### JWT Token Structure
```javascript
// Access Token
{
  userId: "user_id_here",
  type: "access",
  iat: timestamp,
  exp: timestamp
}

// Refresh Token
{
  userId: "user_id_here",
  type: "refresh",
  iat: timestamp,
  exp: timestamp
}
```

### Role-based Access Control
- **Admin**: Truy cập tất cả endpoints
- **User**: Truy cập endpoints của riêng mình
- **Public**: Chỉ endpoints authentication

### Security Features
- Password hashing với bcrypt
- Rate limiting cho API endpoints
- CORS protection
- XSS protection
- MongoDB injection protection
- Helmet security headers

## 🧪 Testing

### Test Structure
```
src/tests/
├── setup.js           # Test configuration
├── auth.test.js       # Authentication tests
├── users.test.js      # User management tests
├── wallets.test.js    # Wallet tests
├── expenses.test.js   # Expense tests
└── labels.test.js     # Label tests
```

### Running Tests
```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- auth.test.js

# Run tests in watch mode
npm test -- --watch
```

## 📊 Monitoring & Logging

### Logging Levels
- **ERROR**: Lỗi nghiêm trọng
- **WARN**: Cảnh báo
- **INFO**: Thông tin chung
- **DEBUG**: Thông tin debug

### Log Files
- `logs/error.log` - Lỗi
- `logs/combined.log` - Tất cả logs

### Health Check
- Endpoint: `GET /health`
- Kiểm tra trạng thái server và database

## 🚀 Deployment

### Production Build
```bash
npm run build
```

### Environment Variables
Đảm bảo cập nhật các biến môi trường cho production:
- `NODE_ENV=production`
- `MONGODB_URI` (production database)
- `JWT_SECRET` (strong secret key)
- `PORT` (production port)

### PM2 (Process Manager)
```bash
npm install -g pm2
pm2 start ecosystem.config.js
```

## 🔧 Development

### Code Style
- ESLint với rules nghiêm ngặt
- Prettier cho formatting
- Consistent naming conventions

### Git Hooks
- Pre-commit hooks với linting
- Commit message conventions

### API Documentation
- Swagger/OpenAPI documentation
- Postman collection
- API testing examples

## 📝 Changelog

### v1.0.0 (Current)
- ✅ Thay thế Mongoose bằng MongoDB Native Driver
- ✅ Implement đầy đủ CRUD operations
- ✅ Authentication & Authorization system
- ✅ User, Wallet, Expense, Label management
- ✅ Comprehensive testing setup
- ✅ Security best practices
- ✅ Logging và monitoring

## 🤝 Contributing

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Tạo Pull Request

## 📄 License

MIT License - xem file [LICENSE](LICENSE) để biết thêm chi tiết.

## 📞 Support

- **Email**: support@uit-web-project.com
- **Issues**: [GitHub Issues](https://github.com/uit-web-project/backend/issues)
- **Documentation**: [Wiki](https://github.com/uit-web-project/backend/wiki)

---

**Lưu ý**: Dự án này sử dụng MongoDB Native Driver thay vì Mongoose để có kiểm soát tốt hơn và hiệu suất cao hơn. Tất cả database operations đều được implement thủ công với proper error handling và validation.
