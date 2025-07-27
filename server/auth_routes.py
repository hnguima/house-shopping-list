from flask import Blueprint, request, jsonify, redirect, current_app
from flask_jwt_extended import (
    create_access_token, create_refresh_token, jwt_required, 
    get_jwt_identity, get_jwt
)
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from models import User
from middleware import validate_json
from session_manager import SessionManager, TokenBlacklist, generate_device_fingerprint
import re
import uuid

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

def validate_email(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_password(password):
    """Validate password strength"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not re.search(r'[A-Za-z]', password):
        return False, "Password must contain at least one letter"
    if not re.search(r'\d', password):
        return False, "Password must contain at least one number"
    return True, "Password is valid"

@auth_bp.route('/register', methods=['POST'])
@validate_json('email', 'username', 'password', 'name')
def register():
    """Register a new user with email/password"""
    try:
        data = request.get_json()
        email = data['email'].strip().lower()
        username = data['username'].strip().lower()
        password = data['password']
        name = data['name'].strip()
        
        # Validate email format
        if not validate_email(email):
            return jsonify({'message': 'Invalid email format'}), 400
        
        # Validate password
        is_valid, message = validate_password(password)
        if not is_valid:
            return jsonify({'message': message}), 400
        
        # Check if user already exists
        existing_user = User.find_by_email(email)
        if existing_user:
            return jsonify({'message': 'User with this email already exists'}), 400
        
        # Check if username is taken
        from database import db
        users_collection = db.get_collection('users')
        if users_collection.find_one({'username': username}):
            return jsonify({'message': 'Username is already taken'}), 400
        
        # Create new user
        user = User.create(email, username, password, name)
        
        # Generate unique JTI for tokens
        access_jti = str(uuid.uuid4())
        refresh_jti = str(uuid.uuid4())
        
        # Create JWT tokens
        access_token = create_access_token(
            identity=user.id,
            additional_claims={'jti': access_jti, 'type': 'access'}
        )
        refresh_token = create_refresh_token(
            identity=user.id,
            additional_claims={'jti': refresh_jti, 'type': 'refresh'}
        )
        
        # Create session (internal tracking only)
        device_info = generate_device_fingerprint(request)
        SessionManager.create_session(
            user.id, access_jti, refresh_jti, device_info
        )
        
        return jsonify({
            'message': 'User created successfully',
            'user': user.to_dict(),
            'access_token': access_token,
            'refresh_token': refresh_token
        }), 201
        
    except Exception as e:
        current_app.logger.error(f"Registration error: {e}")
        return jsonify({'message': 'Registration failed'}), 500

@auth_bp.route('/login', methods=['POST'])
@validate_json('email', 'password')
def login():
    """Login with email/password"""
    try:
        data = request.get_json()
        email = data['email'].strip().lower()
        password = data['password']
        
        # Find user
        user = User.find_by_email(email)
        if not user:
            return jsonify({'message': 'Invalid email or password'}), 401
        
        # Check password
        if not user.check_password(password):
            return jsonify({'message': 'Invalid email or password'}), 401
        
        # Generate unique JTI for tokens
        access_jti = str(uuid.uuid4())
        refresh_jti = str(uuid.uuid4())
        
        # Create JWT tokens
        access_token = create_access_token(
            identity=user.id,
            additional_claims={'jti': access_jti, 'type': 'access'}
        )
        refresh_token = create_refresh_token(
            identity=user.id,
            additional_claims={'jti': refresh_jti, 'type': 'refresh'}
        )
        
        # Create session (internal tracking only)
        device_info = generate_device_fingerprint(request)
        SessionManager.create_session(
            user.id, access_jti, refresh_jti, device_info
        )
        
        return jsonify({
            'message': 'Login successful',
            'user': user.to_dict(),
            'access_token': access_token,
            'refresh_token': refresh_token
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Login error: {e}")
        return jsonify({'message': 'Login failed'}), 500

@auth_bp.route('/google', methods=['GET'])
def google_auth():
    """Initiate Google OAuth flow"""
    from urllib.parse import urlencode
    
    google_auth_url = 'https://accounts.google.com/o/oauth2/v2/auth'
    params = {
        'client_id': current_app.config['GOOGLE_CLIENT_ID'],
        'redirect_uri': current_app.config['GOOGLE_REDIRECT_URI'],
        'scope': 'openid email profile',
        'response_type': 'code',
        'access_type': 'offline',
        'prompt': 'consent'
    }
    
    auth_url = f"{google_auth_url}?{urlencode(params)}"
    return redirect(auth_url)

@auth_bp.route('/google/callback', methods=['GET'])
def google_callback():
    """Handle Google OAuth callback"""
    try:
        code = request.args.get('code')
        if not code:
            return jsonify({'message': 'Authorization code not provided'}), 400
        
        # Exchange code for token
        import requests
        token_url = 'https://oauth2.googleapis.com/token'
        token_data = {
            'client_id': current_app.config['GOOGLE_CLIENT_ID'],
            'client_secret': current_app.config['GOOGLE_CLIENT_SECRET'],
            'code': code,
            'grant_type': 'authorization_code',
            'redirect_uri': current_app.config['GOOGLE_REDIRECT_URI']
        }
        
        token_response = requests.post(token_url, data=token_data)
        token_json = token_response.json()
        
        if 'id_token' not in token_json:
            return jsonify({'message': 'Failed to get ID token'}), 400
        
        # Verify and decode ID token
        id_info = id_token.verify_oauth2_token(
            token_json['id_token'],
            google_requests.Request(),
            current_app.config['GOOGLE_CLIENT_ID']
        )
        
        # Extract user info
        google_id = id_info['sub']
        email = id_info['email']
        name = id_info['name']
        photo = id_info.get('picture')
        
        # Check if user exists
        user = User.find_by_google_id(google_id)
        if not user:
            # Check if user exists with same email but different provider
            existing_user = User.find_by_email(email)
            if existing_user:
                return redirect(f"{current_app.config['FRONTEND_URL']}?error=email_exists")
            
            # Create new user
            user = User.create_from_google(email, name, google_id, photo)
        
        # Generate unique JTI for tokens
        access_jti = str(uuid.uuid4())
        refresh_jti = str(uuid.uuid4())
        
        # Create JWT tokens
        access_token = create_access_token(
            identity=user.id,
            additional_claims={'jti': access_jti, 'type': 'access'}
        )
        refresh_token = create_refresh_token(
            identity=user.id,
            additional_claims={'jti': refresh_jti, 'type': 'refresh'}
        )
        
        # Create session (internal tracking only)
        device_info = generate_device_fingerprint(request)
        SessionManager.create_session(
            user.id, access_jti, refresh_jti, device_info
        )
        
        # Redirect to frontend with tokens
        redirect_url = f"{current_app.config['FRONTEND_URL']}?access_token={access_token}&refresh_token={refresh_token}&user={user.to_dict()}"
        return redirect(redirect_url)
        
    except Exception as e:
        current_app.logger.error(f"Google OAuth error: {e}")
        return redirect(f"{current_app.config['FRONTEND_URL']}?error=oauth_failed")

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current user information"""
    try:
        current_user_id = get_jwt_identity()
        user = User.find_by_id(current_user_id)
        
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        return jsonify({'user': user.to_dict()}), 200
        
    except Exception as e:
        current_app.logger.error(f"Get current user error: {e}")
        return jsonify({'message': 'Failed to get user information'}), 500

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Logout and invalidate session"""
    try:
        # Get current token info
        current_user_id = get_jwt_identity()
        jwt_data = get_jwt()
        access_jti = jwt_data.get('jti')
        
        # Find and invalidate session
        sessions = SessionManager.get_user_sessions(current_user_id)
        for session in sessions:
            if session.get('access_token_jti') == access_jti:
                SessionManager.invalidate_session(str(session['_id']))
                # Blacklist both access and refresh tokens
                TokenBlacklist.add_token(access_jti, 'access')
                if session.get('refresh_token_jti'):
                    TokenBlacklist.add_token(session['refresh_token_jti'], 'refresh')
                break
        
        return jsonify({'message': 'Logged out successfully'}), 200
        
    except Exception as e:
        current_app.logger.error(f"Logout error: {e}")
        return jsonify({'message': 'Logout failed'}), 500

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Refresh access token using refresh token"""
    try:
        current_user_id = get_jwt_identity()
        jwt_data = get_jwt()
        refresh_jti = jwt_data.get('jti')
        
        # Find user
        user = User.find_by_id(current_user_id)
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        # Find session with this refresh token
        sessions = SessionManager.get_user_sessions(current_user_id)
        current_session = None
        for session in sessions:
            if session.get('refresh_token_jti') == refresh_jti:
                current_session = session
                break
        
        if not current_session:
            return jsonify({'message': 'Invalid refresh token'}), 401
        
        # Generate new access token with new JTI
        new_access_jti = str(uuid.uuid4())
        new_access_token = create_access_token(
            identity=current_user_id,
            additional_claims={'jti': new_access_jti, 'type': 'access'}
        )
        
        # Update session with new access token JTI
        from database import db
        from datetime import datetime, timezone
        sessions_collection = db.get_collection('user_sessions')
        sessions_collection.update_one(
            {'_id': current_session['_id']},
            {
                '$set': {
                    'access_token_jti': new_access_jti,
                    'last_activity': datetime.now(timezone.utc)
                }
            }
        )
        
        # Blacklist old access token if it exists
        old_access_jti = current_session.get('access_token_jti')
        if old_access_jti:
            TokenBlacklist.add_token(old_access_jti, 'access')
        
        return jsonify({
            'access_token': new_access_token,
            'message': 'Token refreshed successfully'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Token refresh error: {e}")
        return jsonify({'message': 'Token refresh failed'}), 500
