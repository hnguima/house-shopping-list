from functools import wraps
from flask import request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from database import db
from bson import ObjectId
from session_manager import SessionManager

def auth_required(f):
    """Decorator to require authentication for protected routes"""
    @wraps(f)
    @jwt_required()
    def decorated(*args, **kwargs):
        try:
            # Get current user ID from JWT
            current_user_id = get_jwt_identity()
            jwt_data = get_jwt()
            
            if not current_user_id:
                return jsonify({'message': 'Invalid token'}), 401
            
            # Get user from database
            users_collection = db.get_collection('users')
            user = users_collection.find_one({'_id': ObjectId(current_user_id)})
            
            if not user:
                return jsonify({'message': 'User not found'}), 401
            
            # Update session activity if available
            access_jti = jwt_data.get('jti')
            if access_jti:
                sessions = SessionManager.get_user_sessions(current_user_id)
                for session in sessions:
                    if session.get('access_token_jti') == access_jti:
                        SessionManager.update_session_activity(str(session['_id']))
                        break
            
            # Add user to request context
            request.current_user = user
            
            return f(*args, **kwargs)
        except Exception as e:
            current_app.logger.error(f"Auth middleware error: {e}")
            return jsonify({'message': 'Authentication failed'}), 401
    
    return decorated

def validate_json(*required_fields):
    """Decorator to validate JSON request data"""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not request.is_json:
                return jsonify({'message': 'Content-Type must be application/json'}), 400
            
            data = request.get_json()
            if not data:
                return jsonify({'message': 'No JSON data provided'}), 400
            
            # Check required fields
            missing_fields = [field for field in required_fields if field not in data or not data[field]]
            if missing_fields:
                return jsonify({
                    'message': f'Missing required fields: {", ".join(missing_fields)}'
                }), 400
            
            return f(*args, **kwargs)
        return decorated
    return decorator
