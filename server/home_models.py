from database import db
from bson import ObjectId
from typing import Optional, Dict, Any, List
import time

def get_unix_timestamp() -> int:
    """Get current Unix timestamp in milliseconds"""
    return int(time.time() * 1000)

class Home:
    def __init__(self, data: Dict[str, Any]):
        self.data = data
    
    @property
    def id(self) -> str:
        return str(self.data['_id'])
    
    @classmethod
    def create(cls, creator_id: str, name: str, description: str = "") -> 'Home':
        """Create a new home"""
        home_data = {
            'name': name.strip(),
            'description': description.strip(),
            'creator_id': ObjectId(creator_id),
            'members': [ObjectId(creator_id)],  # Creator is automatically a member
            'createdAt': get_unix_timestamp(),
            'updatedAt': get_unix_timestamp()
        }
        
        homes_collection = db.get_collection('homes')
        result = homes_collection.insert_one(home_data)
        home_data['_id'] = result.inserted_id
        
        return cls(home_data)
    
    @classmethod
    def find_by_id(cls, home_id: str) -> Optional['Home']:
        """Find home by ID"""
        homes_collection = db.get_collection('homes')
        
        try:
            if ObjectId.is_valid(home_id):
                home_data = homes_collection.find_one({'_id': ObjectId(home_id)})
            else:
                return None
        except Exception:
            return None
        
        return cls(home_data) if home_data else None
    
    @classmethod
    def find_by_user_id(cls, user_id: str) -> List['Home']:
        """Find all homes where user is a member"""
        homes_collection = db.get_collection('homes')
        
        homes_data = homes_collection.find({
            'members': ObjectId(user_id)
        }).sort('createdAt', -1)
        
        return [cls(home_data) for home_data in homes_data]
    
    @classmethod
    def find_by_creator_id(cls, creator_id: str) -> List['Home']:
        """Find all homes created by user"""
        homes_collection = db.get_collection('homes')
        
        homes_data = homes_collection.find({
            'creator_id': ObjectId(creator_id)
        }).sort('createdAt', -1)
        
        return [cls(home_data) for home_data in homes_data]
    
    def is_creator(self, user_id: str) -> bool:
        """Check if user is the creator of this home"""
        return str(self.data['creator_id']) == user_id
    
    def is_member(self, user_id: str) -> bool:
        """Check if user is a member of this home"""
        return ObjectId(user_id) in self.data['members']
    
    def add_member(self, user_id: str) -> bool:
        """Add a user as a member of this home"""
        user_object_id = ObjectId(user_id)
        
        if user_object_id in self.data['members']:
            return False  # Already a member
        
        homes_collection = db.get_collection('homes')
        homes_collection.update_one(
            {'_id': self.data['_id']},
            {
                '$push': {'members': user_object_id},
                '$set': {'updatedAt': get_unix_timestamp()}
            }
        )
        
        self.data['members'].append(user_object_id)
        self.data['updatedAt'] = get_unix_timestamp()
        return True
    
    def remove_member(self, user_id: str) -> bool:
        """Remove a user from this home"""
        user_object_id = ObjectId(user_id)
        
        if user_object_id not in self.data['members']:
            return False  # Not a member
        
        # Don't allow removing the creator
        if str(self.data['creator_id']) == user_id:
            return False
        
        homes_collection = db.get_collection('homes')
        homes_collection.update_one(
            {'_id': self.data['_id']},
            {
                '$pull': {'members': user_object_id},
                '$set': {'updatedAt': get_unix_timestamp()}
            }
        )
        
        self.data['members'].remove(user_object_id)
        self.data['updatedAt'] = get_unix_timestamp()
        return True
    
    def update(self, update_data: Dict[str, Any]) -> None:
        """Update home data"""
        update_data['updatedAt'] = get_unix_timestamp()
        
        homes_collection = db.get_collection('homes')
        homes_collection.update_one(
            {'_id': self.data['_id']},
            {'$set': update_data}
        )
        
        self.data.update(update_data)
    
    def delete(self) -> None:
        """Delete the home"""
        homes_collection = db.get_collection('homes')
        homes_collection.delete_one({'_id': self.data['_id']})
    
    def get_member_count(self) -> int:
        """Get the number of members in this home"""
        return len(self.data['members'])
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        result = self.data.copy()
        result['_id'] = str(result['_id'])
        result['creator_id'] = str(result['creator_id'])
        result['members'] = [str(member_id) for member_id in result['members']]
        result['member_count'] = len(result['members'])
        
        return result

class HomeInvitation:
    def __init__(self, data: Dict[str, Any]):
        self.data = data
    
    @property
    def id(self) -> str:
        return str(self.data['_id'])
    
    @classmethod
    def create(cls, home_id: str, from_user_id: str, to_user_email: str, 
               invitation_type: str = "invite", message: str = "", to_user_id: str = None) -> 'HomeInvitation':
        """Create a new home invitation"""
        invitation_data = {
            'home_id': ObjectId(home_id),
            'from_user_id': ObjectId(from_user_id),
            'to_user_email': to_user_email.lower().strip(),
            'type': invitation_type,  # "invite" or "request"
            'status': 'pending',
            'message': message.strip(),
            'createdAt': get_unix_timestamp(),
            'updatedAt': get_unix_timestamp()
        }
        
        if to_user_id:
            invitation_data['to_user_id'] = ObjectId(to_user_id)
        
        invitations_collection = db.get_collection('home_invitations')
        result = invitations_collection.insert_one(invitation_data)
        invitation_data['_id'] = result.inserted_id
        
        return cls(invitation_data)
    
    @classmethod
    def find_by_id(cls, invitation_id: str) -> Optional['HomeInvitation']:
        """Find invitation by ID"""
        invitations_collection = db.get_collection('home_invitations')
        
        try:
            if ObjectId.is_valid(invitation_id):
                invitation_data = invitations_collection.find_one({'_id': ObjectId(invitation_id)})
            else:
                return None
        except Exception:
            return None
        
        return cls(invitation_data) if invitation_data else None
    
    @classmethod
    def find_pending_for_user(cls, user_id: str, user_email: str) -> List['HomeInvitation']:
        """Find all pending invitations for a user"""
        invitations_collection = db.get_collection('home_invitations')
        
        # Find invitations by email or user ID
        query = {
            'status': 'pending',
            '$or': [
                {'to_user_email': user_email.lower()},
                {'to_user_id': ObjectId(user_id)}
            ]
        }
        
        invitations_data = invitations_collection.find(query).sort('createdAt', -1)
        return [cls(invitation_data) for invitation_data in invitations_data]
    
    @classmethod
    def find_pending_for_home(cls, home_id: str) -> List['HomeInvitation']:
        """Find all pending invitations for a home"""
        invitations_collection = db.get_collection('home_invitations')
        
        invitations_data = invitations_collection.find({
            'home_id': ObjectId(home_id),
            'status': 'pending'
        }).sort('createdAt', -1)
        
        return [cls(invitation_data) for invitation_data in invitations_data]
    
    @classmethod
    def find_sent_by_user(cls, user_id: str) -> List['HomeInvitation']:
        """Find all invitations sent by a user"""
        invitations_collection = db.get_collection('home_invitations')
        
        invitations_data = invitations_collection.find({
            'from_user_id': ObjectId(user_id)
        }).sort('createdAt', -1)
        
        return [cls(invitation_data) for invitation_data in invitations_data]
    
    @classmethod
    def check_existing_invitation(cls, home_id: str, to_user_email: str, invitation_type: str) -> Optional['HomeInvitation']:
        """Check if there's already a pending invitation"""
        invitations_collection = db.get_collection('home_invitations')
        
        invitation_data = invitations_collection.find_one({
            'home_id': ObjectId(home_id),
            'to_user_email': to_user_email.lower(),
            'type': invitation_type,
            'status': 'pending'
        })
        
        return cls(invitation_data) if invitation_data else None
    
    @classmethod
    def check_existing_request_from_user(cls, home_id: str, from_user_id: str, invitation_type: str) -> Optional['HomeInvitation']:
        """Check if there's already a pending request from a specific user"""
        invitations_collection = db.get_collection('home_invitations')
        
        invitation_data = invitations_collection.find_one({
            'home_id': ObjectId(home_id),
            'from_user_id': ObjectId(from_user_id),
            'type': invitation_type,
            'status': 'pending'
        })
        
        return cls(invitation_data) if invitation_data else None
    
    def accept(self) -> bool:
        """Accept the invitation"""
        if self.data['status'] != 'pending':
            return False
        
        self.update({'status': 'accepted'})
        return True
    
    def reject(self) -> bool:
        """Reject the invitation"""
        if self.data['status'] != 'pending':
            return False
        
        self.update({'status': 'rejected'})
        return True
    
    def update(self, update_data: Dict[str, Any]) -> None:
        """Update invitation data"""
        update_data['updatedAt'] = get_unix_timestamp()
        
        invitations_collection = db.get_collection('home_invitations')
        invitations_collection.update_one(
            {'_id': self.data['_id']},
            {'$set': update_data}
        )
        
        self.data.update(update_data)
    
    def delete(self) -> None:
        """Delete the invitation"""
        invitations_collection = db.get_collection('home_invitations')
        invitations_collection.delete_one({'_id': self.data['_id']})
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        result = self.data.copy()
        result['_id'] = str(result['_id'])
        result['home_id'] = str(result['home_id'])
        result['from_user_id'] = str(result['from_user_id'])
        
        if 'to_user_id' in result:
            result['to_user_id'] = str(result['to_user_id'])
        
        return result
