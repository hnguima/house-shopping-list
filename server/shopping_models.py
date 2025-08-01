from database import db
from bson import ObjectId
from typing import Optional, Dict, Any, List
import time

def get_unix_timestamp() -> int:
    """Get current Unix timestamp in milliseconds"""
    return int(time.time() * 1000)

class ShoppingList:
    def __init__(self, data: Dict[str, Any]):
        self.data = data
    
    @property
    def id(self) -> str:
        return str(self.data['_id'])
    
    @classmethod
    def create(cls, user_id: str, name: str, description: str = "", color: str = "#1976d2", list_id: str = None, items: List[Dict[str, Any]] = None, home_id: str = None) -> 'ShoppingList':
        """Create a new shopping list with optional custom ID and items"""
        print(f"[ShoppingList.create] Creating list for user {user_id}: {name}, custom_id={list_id}, items_count={len(items) if items else 0}, home_id={home_id}")
        
        list_data = {
            'user_id': ObjectId(user_id),
            'name': name,
            'description': description,
            'color': color,  # Default to Material-UI primary blue
            'archived': False,
            'status': 'active',  # New status field: active, completed, archived, deleted
            'home_id': ObjectId(home_id) if home_id else None,  # Optional home association
            'items': items or [],  # Use provided items or empty list
            'createdAt': get_unix_timestamp(),
            'updatedAt': get_unix_timestamp()
        }
        
        # Use custom ID if provided, otherwise let MongoDB generate one
        if list_id:
            list_data['_id'] = list_id
        
        print(f"[ShoppingList.create] List data prepared: {list_data}")
        
        shopping_lists_collection = db.get_collection('shopping_lists')
        print(f"[ShoppingList.create] Got collection: {shopping_lists_collection}")
        
        result = shopping_lists_collection.insert_one(list_data)
        print(f"[ShoppingList.create] Insert result: {result.inserted_id}")
        
        # If we didn't provide custom ID, use the generated one
        if not list_id:
            list_data['_id'] = result.inserted_id
        
        print(f"[ShoppingList.create] Final list data: {list_data}")
        
        return cls(list_data)
    
    @classmethod
    def find_by_user_id(cls, user_id: str, include_archived: bool = False, home_id: str = None) -> List['ShoppingList']:
        """Find all shopping lists for a user, including home lists they have access to"""
        shopping_lists_collection = db.get_collection('shopping_lists')
        
        if home_id:
            # Find lists for a specific home
            query = {
                'home_id': ObjectId(home_id) if home_id != 'personal' else None,
                'status': {'$ne': 'deleted'}
            }
            if not include_archived:
                query['status'] = 'active'
        else:
            # Find user's personal lists + all home lists they have access to
            from home_models import Home
            user_homes = Home.find_by_user_id(user_id)
            home_ids = [ObjectId(home.id) for home in user_homes]
            
            query = {
                '$or': [
                    {'user_id': ObjectId(user_id)},  # Personal lists
                    {'home_id': {'$in': home_ids}}   # Home lists
                ],
                'status': {'$ne': 'deleted'}
            }
            if not include_archived:
                query['status'] = 'active'
        
        lists_data = list(shopping_lists_collection.find(query).sort('createdAt', 1))
        return [cls(list_data) for list_data in lists_data]
    
    @classmethod
    def find_by_id(cls, list_id: str, user_id: str = None) -> Optional['ShoppingList']:
        """Find shopping list by ID with optional user permission check"""
        shopping_lists_collection = db.get_collection('shopping_lists')
        
        # Handle both MongoDB ObjectIds and custom frontend-generated IDs
        if ObjectId.is_valid(list_id):
            # Traditional MongoDB ObjectId
            query_id = ObjectId(list_id)
        else:
            # Custom frontend-generated ID (string)
            query_id = list_id
        
        query = {'_id': query_id}
        
        # If user_id provided, check permissions
        if user_id:
            from home_models import Home
            user_homes = Home.find_by_user_id(user_id)
            home_ids = [ObjectId(home.id) for home in user_homes]
            
            query['$or'] = [
                {'user_id': ObjectId(user_id)},  # User owns the list
                {'home_id': {'$in': home_ids}}   # User has access through home
            ]
        
        list_data = shopping_lists_collection.find_one(query)
        return cls(list_data) if list_data else None
    
    def update(self, update_data: Dict[str, Any]) -> None:
        """Update shopping list"""
        update_data['updatedAt'] = get_unix_timestamp()
        
        shopping_lists_collection = db.get_collection('shopping_lists')
        shopping_lists_collection.update_one(
            {'_id': self.data['_id']},
            {'$set': update_data}
        )
        
        # Update local data
        self.data.update(update_data)
    
    def add_item(self, name: str, quantity: int = 1, category: str = "", notes: str = "") -> Dict[str, Any]:
        """Add an item to the shopping list"""
        item = {
            'id': str(ObjectId()),  # Generate unique ID for the item
            'name': name,
            'quantity': quantity,
            'category': category,
            'notes': notes,
            'completed': False,
            'createdAt': get_unix_timestamp(),
            'updatedAt': get_unix_timestamp()
        }
        
        # Add item to the list
        self.data['items'].append(item)
        
        # Update in database
        shopping_lists_collection = db.get_collection('shopping_lists')
        shopping_lists_collection.update_one(
            {'_id': self.data['_id']},
            {
                '$push': {'items': item},
                '$set': {'updatedAt': get_unix_timestamp()}
            }
        )
        
        return item
    
    def update_item(self, item_id: str, update_data: Dict[str, Any]) -> bool:
        """Update an item in the shopping list"""
        # Find item index
        item_index = None
        for i, item in enumerate(self.data['items']):
            if item['id'] == item_id:
                item_index = i
                break
        
        if item_index is None:
            return False
        
        # Update item data
        update_data['updatedAt'] = get_unix_timestamp()
        self.data['items'][item_index].update(update_data)
        
        # Update in database
        shopping_lists_collection = db.get_collection('shopping_lists')
        update_fields = {f'items.$.{key}': value for key, value in update_data.items()}
        update_fields['updatedAt'] = get_unix_timestamp()
        
        shopping_lists_collection.update_one(
            {'_id': self.data['_id'], 'items.id': item_id},
            {'$set': update_fields}
        )
        
        return True
    
    def remove_item(self, item_id: str) -> bool:
        """Remove an item from the shopping list"""
        # Find and remove item
        original_length = len(self.data['items'])
        self.data['items'] = [item for item in self.data['items'] if item['id'] != item_id]
        
        if len(self.data['items']) == original_length:
            return False  # Item not found
        
        # Update in database
        shopping_lists_collection = db.get_collection('shopping_lists')
        shopping_lists_collection.update_one(
            {'_id': self.data['_id']},
            {
                '$pull': {'items': {'id': item_id}},
                '$set': {'updatedAt': get_unix_timestamp()}
            }
        )
        
        return True
    
    def archive(self) -> None:
        """Archive the shopping list (deprecated - use set_status)"""
        self.update({'archived': True, 'status': 'archived'})
    
    def unarchive(self) -> None:
        """Unarchive the shopping list (deprecated - use set_status)"""
        self.update({'archived': False, 'status': 'active'})
    
    def set_status(self, status: str) -> None:
        """Set the status of the shopping list"""
        valid_statuses = ['active', 'completed', 'archived', 'deleted']
        if status not in valid_statuses:
            raise ValueError(f"Invalid status: {status}. Must be one of {valid_statuses}")
        
        update_data = {'status': status}
        # Keep archived field for backward compatibility
        if status == 'archived':
            update_data['archived'] = True
        else:
            update_data['archived'] = False
            
        self.update(update_data)
    
    def delete(self) -> None:
        """Soft delete the shopping list by setting status to deleted"""
        self.set_status('deleted')
    
    def hard_delete(self) -> None:
        """Permanently delete the shopping list from database"""
        shopping_lists_collection = db.get_collection('shopping_lists')
        shopping_lists_collection.delete_one({'_id': self.data['_id']})
    
    def is_owned_by(self, user_id: str) -> bool:
        """Check if the list is owned by the specified user"""
        return str(self.data['user_id']) == user_id
    
    def is_in_home(self) -> bool:
        """Check if the list belongs to a home"""
        return self.data.get('home_id') is not None
    
    def can_user_edit(self, user_id: str) -> bool:
        """Check if user can edit this list (owners can edit metadata, home members can edit items)"""
        if self.is_owned_by(user_id):
            return True
        
        # For home lists, members can edit items but not list metadata
        if self.is_in_home():
            from home_models import Home
            home = Home.find_by_id(str(self.data['home_id']))
            return home and home.is_member(user_id)
        
        return False
    
    def can_user_complete_items(self, user_id: str) -> bool:
        """Check if user can mark items as completed (owners and home members)"""
        if self.is_owned_by(user_id):
            return True
        
        if self.is_in_home():
            from home_models import Home
            home = Home.find_by_id(str(self.data['home_id']))
            return home and home.is_member(user_id)
        
        return False
    
    def can_be_completed(self) -> bool:
        """Check if the list can be marked as completed (all items are checked)"""
        items = self.data.get('items', [])
        if not items:
            return False  # Empty lists can't be completed
        
        return all(item.get('completed', False) for item in items)
    
    def get_completion_percentage(self) -> float:
        """Get the completion percentage of the list"""
        items = self.data.get('items', [])
        if not items:
            return 0.0
        
        completed_items = sum(1 for item in items if item.get('completed', False))
        return (completed_items / len(items)) * 100
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        result = self.data.copy()
        result['_id'] = str(result['_id'])
        result['user_id'] = str(result['user_id'])
        
        # Convert home_id to string if present
        if result.get('home_id'):
            result['home_id'] = str(result['home_id'])
        
        # Add computed fields
        result['can_be_completed'] = self.can_be_completed()
        result['completion_percentage'] = self.get_completion_percentage()
        
        # Ensure status field exists (for backward compatibility)
        if 'status' not in result:
            result['status'] = 'archived' if result.get('archived', False) else 'active'
        
        return result

class ShoppingListStats:
    """Utility class for shopping list statistics"""
    
    @staticmethod
    def get_user_stats(user_id: str) -> Dict[str, Any]:
        """Get statistics for user's shopping lists"""
        shopping_lists = ShoppingList.find_by_user_id(user_id, include_archived=True)
        
        total_lists = len(shopping_lists)
        active_lists = sum(1 for sl in shopping_lists if not sl.data.get('archived', False))
        archived_lists = total_lists - active_lists
        
        total_items = sum(len(sl.data.get('items', [])) for sl in shopping_lists)
        completed_items = sum(
            sum(1 for item in sl.data.get('items', []) if item.get('completed', False))
            for sl in shopping_lists
        )
        
        return {
            'total_lists': total_lists,
            'active_lists': active_lists,
            'archived_lists': archived_lists,
            'total_items': total_items,
            'completed_items': completed_items,
            'completion_rate': (completed_items / total_items * 100) if total_items > 0 else 0
        }
