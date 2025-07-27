# Shopping List API Backend

A Flask RESTful API backend for the Shopping List application with MongoDB and Google OAuth support.

## Features

- User authentication (email/password and Google OAuth)
- JWT token-based authorization
- MongoDB database with user management
- Profile management with photo upload
- CORS enabled for frontend integration
- Input validation and error handling

## Setup Instructions

### 1. Install Dependencies

```bash
cd server
pip install -r requirements.txt
```

### 2. MongoDB Setup

Install and start MongoDB:
- Install MongoDB Community Edition
- Start MongoDB service: `sudo systemctl start mongod`
- Verify it's running: `sudo systemctl status mongod`

### 3. Environment Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your configuration:
   - Change secret keys for production
   - Set MongoDB URI if different
   - Configure Google OAuth credentials (optional)

### 4. Google OAuth Setup (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:5000/api/auth/google/callback`
6. Update `.env` with your client ID and secret

### 5. Run the Application

```bash
python app.py
```

The API will be available at `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - Google OAuth callback
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/logout` - Logout

### User Profile
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `POST /api/user/upload-photo` - Upload profile photo

### System
- `GET /health` - Health check
- `GET /api` - API information

## Database Schema

### Users Collection
```json
{
  "_id": "ObjectId",
  "email": "string",
  "username": "string", 
  "password_hash": "string",
  "name": "string",
  "provider": "local|google",
  "google_id": "string",
  "photo": "string",
  "preferences": {
    "theme": "light|dark",
    "language": "string"
  },
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Input validation and sanitization
- CORS protection
- Rate limiting ready (can be added)
- Environment-based configuration

## Development

### Running in Development Mode
```bash
export FLASK_ENV=development
python app.py
```

### Testing the API
Use tools like Postman or curl to test endpoints:

```bash
# Register a new user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","username":"testuser","password":"password123","name":"Test User"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```
