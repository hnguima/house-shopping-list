from database import db
from datetime import datetime, timezone
from bson import ObjectId
import bcrypt
from typing import Optional, Dict, Any

class User:
    def __init__(self, data: Dict[str, Any]):
        self.data = data
    
    @classmethod
    def create(cls, email: str, username: str, password: str, name: str) -> 'User':
        """Create a new user with email/password"""
        # Hash password
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        
        user_data = {
            'email': email.lower(),
            'username': username.lower(),
            'password_hash': password_hash,
            'name': name,
            'provider': 'local',
            'photo': None,
            'preferences': {
                'theme': 'light',
                'language': 'en'
            },
            'createdAt': datetime.now(timezone.utc),
            'updatedAt': datetime.now(timezone.utc)
        }
        
        users_collection = db.get_collection('users')
        result = users_collection.insert_one(user_data)
        user_data['_id'] = result.inserted_id
        
        return cls(user_data)
    
    @classmethod
    def create_from_google(cls, email: str, name: str, google_id: str, photo: str = None) -> 'User':
        """Create a new user from Google OAuth"""
        # Generate username from email
        username = email.split('@')[0].lower()
        
        # Ensure username is unique
        users_collection = db.get_collection('users')
        counter = 1
        original_username = username
        while users_collection.find_one({'username': username}):
            username = f"{original_username}{counter}"
            counter += 1
        
        user_data = {
            'email': email.lower(),
            'username': username,
            'password_hash': None,  # No password for OAuth users
            'name': name,
            'provider': 'google',
            'google_id': google_id,
            'photo': photo,
            'preferences': {
                'theme': 'light',
                'language': 'en'
            },
            'createdAt': datetime.now(timezone.utc),
            'updatedAt': datetime.now(timezone.utc)
        }
        
        result = users_collection.insert_one(user_data)
        user_data['_id'] = result.inserted_id
        
        return cls(user_data)
    
    @classmethod
    def find_by_email(cls, email: str) -> Optional['User']:
        """Find user by email"""
        users_collection = db.get_collection('users')
        user_data = users_collection.find_one({'email': email.lower()})
        return cls(user_data) if user_data else None
    
    @classmethod
    def find_by_id(cls, user_id: str) -> Optional['User']:
        """Find user by ID"""
        users_collection = db.get_collection('users')
        user_data = users_collection.find_one({'_id': ObjectId(user_id)})
        return cls(user_data) if user_data else None
    
    @classmethod
    def find_by_google_id(cls, google_id: str) -> Optional['User']:
        """Find user by Google ID"""
        users_collection = db.get_collection('users')
        user_data = users_collection.find_one({'google_id': google_id})
        return cls(user_data) if user_data else None
    
    def check_password(self, password: str) -> bool:
        """Check if provided password matches user's password"""
        if not self.data.get('password_hash'):
            return False
        return bcrypt.checkpw(password.encode('utf-8'), self.data['password_hash'])
    
    def update(self, update_data: Dict[str, Any]) -> None:
        """Update user data"""
        update_data['updatedAt'] = datetime.now(timezone.utc)
        
        users_collection = db.get_collection('users')
        users_collection.update_one(
            {'_id': self.data['_id']},
            {'$set': update_data}
        )
        
        # Update local data
        self.data.update(update_data)
    
    def to_dict(self, include_sensitive: bool = False) -> Dict[str, Any]:
        """Convert user to dictionary for API responses"""
        user_dict = {
            'id': str(self.data['_id']),
            'email': self.data['email'],
            'username': self.data['username'],
            'name': self.data['name'],
            'provider': self.data['provider'],
            'photo': self.data.get('photo'),
            'preferences': self.data.get('preferences', {}),
            'createdAt': int(self.data['createdAt'].timestamp()),
            'updatedAt': int(self.data['updatedAt'].timestamp())
        }
        
        if include_sensitive:
            user_dict['google_id'] = self.data.get('google_id')
        
        return user_dict
    
    @property
    def id(self) -> str:
        return str(self.data['_id'])
