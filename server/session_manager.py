"""
Session management for JWT tokens
Handles token blacklisting, refresh tokens, and session tracking
"""

from database import db
from datetime import datetime, timedelta, timezone
import secrets
from typing import Optional, Dict, Any
from bson import ObjectId

class SessionManager:
    """Manage user sessions and JWT tokens"""
    
    @staticmethod
    def create_session(user_id: str, access_token: str, refresh_token: str, 
                      device_info: Optional[Dict[str, Any]] = None) -> str:
        """Create a new user session"""
        sessions_collection = db.get_collection('user_sessions')
        
        session_data = {
            'user_id': user_id,
            'access_token_jti': access_token,  # JWT ID
            'refresh_token_jti': refresh_token,  # JWT ID
            'device_info': device_info or {},
            'created_at': datetime.now(timezone.utc),
            'last_activity': datetime.now(timezone.utc),
            'is_active': True
        }
        
        result = sessions_collection.insert_one(session_data)
        return str(result.inserted_id)
    
    @staticmethod
    def get_session(session_id: str) -> Optional[Dict[str, Any]]:
        """Get session by ID"""
        sessions_collection = db.get_collection('user_sessions')
        session = sessions_collection.find_one({'_id': ObjectId(session_id)})
        return session
    
    @staticmethod
    def update_session_activity(session_id: str) -> bool:
        """Update last activity timestamp for session"""
        sessions_collection = db.get_collection('user_sessions')
        result = sessions_collection.update_one(
            {'_id': ObjectId(session_id)},
            {'$set': {'last_activity': datetime.now(timezone.utc)}}
        )
        return result.modified_count > 0
    
    @staticmethod
    def invalidate_session(session_id: str) -> bool:
        """Invalidate a specific session"""
        sessions_collection = db.get_collection('user_sessions')
        result = sessions_collection.update_one(
            {'_id': ObjectId(session_id)},
            {'$set': {'is_active': False, 'invalidated_at': datetime.now(timezone.utc)}}
        )
        return result.modified_count > 0
    
    @staticmethod
    def invalidate_user_sessions(user_id: str, exclude_session_id: Optional[str] = None) -> int:
        """Invalidate all sessions for a user, optionally excluding one session"""
        sessions_collection = db.get_collection('user_sessions')
        
        query = {'user_id': user_id, 'is_active': True}
        if exclude_session_id:
            query['_id'] = {'$ne': ObjectId(exclude_session_id)}
        
        result = sessions_collection.update_many(
            query,
            {'$set': {'is_active': False, 'invalidated_at': datetime.now(timezone.utc)}}
        )
        return result.modified_count
    
    @staticmethod
    def get_user_sessions(user_id: str, active_only: bool = True) -> list:
        """Get all sessions for a user"""
        sessions_collection = db.get_collection('user_sessions')
        
        query = {'user_id': user_id}
        if active_only:
            query['is_active'] = True
        
        sessions = list(sessions_collection.find(query).sort('last_activity', -1))
        return sessions
    
    @staticmethod
    def cleanup_expired_sessions() -> int:
        """Remove sessions older than 30 days"""
        sessions_collection = db.get_collection('user_sessions')
        
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=30)
        result = sessions_collection.delete_many({
            'created_at': {'$lt': cutoff_date}
        })
        return result.deleted_count


class TokenBlacklist:
    """Manage blacklisted JWT tokens"""
    
    @staticmethod
    def add_token(jti: str, token_type: str = 'access', expires_at: Optional[datetime] = None) -> bool:
        """Add token to blacklist"""
        blacklist_collection = db.get_collection('token_blacklist')
        
        token_data = {
            'jti': jti,
            'token_type': token_type,
            'blacklisted_at': datetime.now(timezone.utc),
            'expires_at': expires_at
        }
        
        # Use upsert to avoid duplicates
        blacklist_collection.update_one(
            {'jti': jti},
            {'$set': token_data},
            upsert=True
        )
        return True
    
    @staticmethod
    def is_token_blacklisted(jti: str) -> bool:
        """Check if token is blacklisted"""
        blacklist_collection = db.get_collection('token_blacklist')
        token = blacklist_collection.find_one({'jti': jti})
        return token is not None
    
    @staticmethod
    def cleanup_expired_tokens() -> int:
        """Remove expired tokens from blacklist"""
        blacklist_collection = db.get_collection('token_blacklist')
        
        current_time = datetime.now(timezone.utc)
        result = blacklist_collection.delete_many({
            'expires_at': {'$lt': current_time}
        })
        return result.deleted_count


def generate_device_fingerprint(request) -> Dict[str, Any]:
    """Generate device fingerprint from request headers"""
    return {
        'user_agent': request.headers.get('User-Agent', ''),
        'ip_address': request.remote_addr,
        'accept_language': request.headers.get('Accept-Language', ''),
        'accept_encoding': request.headers.get('Accept-Encoding', ''),
    }
