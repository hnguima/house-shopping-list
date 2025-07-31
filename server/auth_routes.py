from flask import Blueprint, request, jsonify, redirect, current_app, session
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
import json
import base64
import urllib.parse
from secrets import token_urlsafe

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

# Default frontend URLs
DEFAULT_WEB_REDIRECT_URL = 'http://localhost:5173'

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

@auth_bp.route('/google/url', methods=['GET'])
def get_google_oauth_url():
    """Get the Google OAuth URL for frontend to redirect to."""
    try:
        # Get parameters
        target_redirect = request.args.get('target_redirect', 'web')
        web_redirect_url = request.args.get('web_redirect_url', DEFAULT_WEB_REDIRECT_URL)
        
        current_app.logger.info(f"OAuth URL request - target: {target_redirect}, web_redirect: {web_redirect_url}")
        
        # Store in session for callback
        session['target_redirect'] = target_redirect
        session['web_redirect_url'] = web_redirect_url
        
        # Generate state parameter with platform info
        state_data = {
            'random': token_urlsafe(24),
            'target_redirect': target_redirect,
            'web_redirect_url': web_redirect_url
        }
        state = base64.urlsafe_b64encode(json.dumps(state_data).encode()).decode()
        session['oauth_state'] = state
        
        # Build OAuth URL
        google_auth_url = 'https://accounts.google.com/o/oauth2/v2/auth'
        params = {
            'client_id': current_app.config['GOOGLE_CLIENT_ID'],
            'redirect_uri': current_app.config['GOOGLE_REDIRECT_URI'],
            'scope': 'openid email profile',
            'response_type': 'code',
            'access_type': 'offline',
            'prompt': 'consent',
            'state': state
        }
        
        auth_url = f"{google_auth_url}?{urllib.parse.urlencode(params)}"
        
        return jsonify({
            "auth_url": auth_url,
            "state": state
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error generating OAuth URL: {e}")
        return jsonify({"error": "Failed to generate OAuth URL"}), 500

@auth_bp.route('/google', methods=['GET'])
def google_auth():
    """Initiate Google OAuth flow (legacy endpoint)"""
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
    """Handle Google OAuth callback with web/mobile platform detection"""
    try:
        # Get parameters
        code = request.args.get('code')
        state = request.args.get('state')
        error = request.args.get('error')
        
        current_app.logger.info(f"OAuth callback - code: {bool(code)}, state: {state}, error: {error}")
        
        # Check for OAuth errors
        if error:
            current_app.logger.error(f"OAuth error: {error}")
            error_description = request.args.get('error_description', 'Unknown OAuth error')
            return handle_oauth_error(error, error_description)
        
        if not code:
            return handle_oauth_error('no_code', 'Authorization code not provided')
        
        # Get platform info from state or session
        target_redirect = 'web'  # default
        web_redirect_url = DEFAULT_WEB_REDIRECT_URL  # default
        
        try:
            if state:
                state_data = json.loads(base64.urlsafe_b64decode(state.encode()).decode())
                target_redirect = state_data.get('target_redirect', 'web')
                web_redirect_url = state_data.get('web_redirect_url', DEFAULT_WEB_REDIRECT_URL)
                current_app.logger.info(f"Decoded state - target: {target_redirect}, web_redirect: {web_redirect_url}")
            else:
                # Fallback to session
                target_redirect = session.get('target_redirect', 'web')
                web_redirect_url = session.get('web_redirect_url', DEFAULT_WEB_REDIRECT_URL)
                current_app.logger.info(f"Using session - target: {target_redirect}, web_redirect: {web_redirect_url}")
        except Exception as decode_error:
            current_app.logger.warning(f"Failed to decode state parameter: {decode_error}")
        
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
        
        token_response = requests.post(token_url, data=token_data, timeout=10)
        token_json = token_response.json()
        
        if 'id_token' not in token_json:
            return handle_oauth_error('no_id_token', 'Failed to get ID token')
        
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
                # Link Google account to existing user
                existing_user.link_google_account(google_id, photo)
                user = existing_user
            else:
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
        
        # Prepare user data
        user_data = {
            'id': str(user.data['_id']),
            'email': user.data['email'],
            'name': user.data['name'],
            'username': user.data['username'],
            'provider': 'google'
        }
        
        # Handle platform-specific redirects
        if target_redirect == 'mobile':
            # Mobile redirect with deep link
            mobile_params = urllib.parse.urlencode({
                'success': 'true',
                'username': user_data['username'],
                'email': user_data['email'],
                'name': user_data['name'],
                'provider': user_data['provider'],
                'access_token': access_token,
                'refresh_token': refresh_token
            })
            deep_link_url = f'com.houseshoppinglist://auth/callback?{mobile_params}'
            
            return f"""<!DOCTYPE html>
<html><head><title>Login Success - Mobile</title></head><body>
<script>
    console.log("Mobile OAuth callback: redirecting to app");
    window.location.href = '{deep_link_url}';
</script>
<p>Login successful! Redirecting to app...</p>
<p>If you're not redirected automatically, <a href="{deep_link_url}">click here</a></p>
</body></html>"""
        else:
            # Web redirect - communicate with parent window via postMessage
            user_json = json.dumps(user_data)
            
            return f'''<!DOCTYPE html>
<html><head><title>Login Success</title></head><body>
<p>Authentication successful! Closing window...</p>
<script>
    console.log("OAuth callback: communicating with parent window");
    
    // Try to communicate with the parent window if this is in a popup
    if (window.opener) {{
        window.opener.postMessage({{
            type: 'OAUTH_SUCCESS',
            access_token: '{access_token}',
            refresh_token: '{refresh_token}',
            user: '{user_json}'
        }}, '*');
        window.close();
    }} else {{
        // Fallback: redirect if not in popup
        window.location.href = "{web_redirect_url}?oauth_success=true&user_data={urllib.parse.quote(user_json)}&access_token={access_token}&refresh_token={refresh_token}";
    }}
</script>
</body></html>'''
        
    except Exception as e:
        current_app.logger.error(f"Google OAuth error: {e}")
        return handle_oauth_error('server_error', str(e))

def handle_oauth_error(error_type, error_description):
    """Handle OAuth errors for both web and mobile"""
    # Try to get platform info from session
    target_redirect = session.get('target_redirect', 'web')
    web_redirect_url = session.get('web_redirect_url', DEFAULT_WEB_REDIRECT_URL)
    
    if target_redirect == 'mobile':
        # Mobile error redirect
        error_params = urllib.parse.urlencode({
            'error': error_type,
            'error_description': error_description
        })
        deep_link_url = f'com.houseshoppinglist://auth/callback?{error_params}'
        
        return f"""<!DOCTYPE html>
<html><head><title>Login Failed</title></head><body>
<script>
    window.location.href = '{deep_link_url}';
</script>
<p>Authentication failed: {error_description}</p>
</body></html>"""
    else:
        # Web error - communicate with parent window
        return f'''<!DOCTYPE html>
<html><head><title>Login Failed</title></head><body>
<p>Authentication failed: {error_description}</p>
<script>
    console.log("OAuth error: communicating with parent window");
    
    if (window.opener) {{
        window.opener.postMessage({{
            type: 'OAUTH_ERROR',
            error: '{error_type}',
            error_description: '{error_description}'
        }}, '*');
        window.close();
    }} else {{
        // Fallback: redirect if not in popup
        window.location.href = "{web_redirect_url}?oauth_error={error_type}&error_description={urllib.parse.quote(error_description)}";
    }}
</script>
</body></html>'''

@auth_bp.route('/google/native', methods=['POST'])
@validate_json('idToken')
def google_native_auth():
    """Handle native Google OAuth authentication"""
    try:
        data = request.get_json()
        id_token_str = data['idToken']
        
        # Verify the ID token
        google_client_id = current_app.config['GOOGLE_CLIENT_ID']
        try:
            idinfo = id_token.verify_oauth2_token(
                id_token_str, google_requests.Request(), google_client_id
            )
        except ValueError as e:
            current_app.logger.error(f"Invalid Google ID token: {e}")
            return jsonify({'message': 'Invalid Google ID token'}), 400
        
        # Extract user information
        google_id = idinfo['sub']
        email = idinfo['email']
        name = idinfo.get('name', '')
        picture = idinfo.get('picture', '')
        
        # Check if user exists
        user = User.find_by_google_id(google_id)
        if not user:
            # Check if email already exists with different provider
            existing_user = User.find_by_email(email)
            if existing_user:
                # Link Google account to existing user
                existing_user.link_google_account(google_id, picture)
                user = existing_user
                current_app.logger.info(f"Linked Google account to existing user: {email}")
            else:
                # Create new user
                user = User.create_from_google(email, name, google_id, picture)
                current_app.logger.info(f"Created new user from Google: {email}")
        else:
            # Update existing user's photo if needed
            if picture and user.data.get('photo') != picture:
                user.update({'photo': picture})
        
        # Generate device fingerprint and tokens
        device_info = generate_device_fingerprint(request)
        access_jti = str(uuid.uuid4())
        refresh_jti = str(uuid.uuid4())
        
        access_token = create_access_token(
            identity=user.id,
            additional_claims={'jti': access_jti}
        )
        refresh_token = create_refresh_token(
            identity=user.id,
            additional_claims={'jti': refresh_jti}
        )
        
        # Create session
        SessionManager.create_session(
            user.id, access_jti, refresh_jti, device_info
        )
        
        return jsonify({
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Native Google OAuth error: {e}")
        return jsonify({'message': 'Authentication failed'}), 500

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

@auth_bp.route('/callback-success', methods=['GET'])
def callback_success():
    """Handle OAuth callback success page"""
    access_token = request.args.get('access_token')
    refresh_token = request.args.get('refresh_token')
    user_data = request.args.get('user')
    error = request.args.get('error')
    
    if error:
        return f"""
        <html>
        <head><title>Login Failed</title></head>
        <body>
            <h1>Login Failed</h1>
            <p>Authentication failed: {error}</p>
            <p>Please close this window and try again.</p>
        </body>
        </html>
        """, 400
    
    if access_token and refresh_token:
        return f"""
        <html>
        <head><title>Login Successful</title></head>
        <body>
            <h1>Login Successful!</h1>
            <p>You have been successfully authenticated.</p>
            <p>Please close this window and return to the app.</p>
            <script>
                // Try to communicate with the parent window if this is in a popup
                if (window.opener) {{
                    window.opener.postMessage({{
                        type: 'OAUTH_SUCCESS',
                        access_token: '{access_token}',
                        refresh_token: '{refresh_token}',
                        user: '{user_data}'
                    }}, '*');
                    window.close();
                }}
            </script>
        </body>
        </html>
        """
    
    return """
    <html>
    <head><title>Authentication</title></head>
    <body>
        <h1>Authentication in progress...</h1>
        <p>Please wait while we complete your authentication.</p>
    </body>
    </html>
    """
