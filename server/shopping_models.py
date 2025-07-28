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
    def create(cls, user_id: str, name: str, description: str = "", color: str = "#1976d2") -> 'ShoppingList':
        """Create a new shopping list"""
        list_data = {
            'user_id': ObjectId(user_id),
            'name': name,
            'description': description,
            'color': color,  # Default to Material-UI primary blue
            'archived': False,
            'items': [],
            'createdAt': get_unix_timestamp(),
            'updatedAt': get_unix_timestamp()
        }
        
        shopping_lists_collection = db.get_collection('shopping_lists')
        result = shopping_lists_collection.insert_one(list_data)
        list_data['_id'] = result.inserted_id
        
        return cls(list_data)
    
    @classmethod
    def find_by_user_id(cls, user_id: str, include_archived: bool = False) -> List['ShoppingList']:
        """Find all shopping lists for a user"""
        shopping_lists_collection = db.get_collection('shopping_lists')
        
        query = {'user_id': ObjectId(user_id)}
        if not include_archived:
            query['archived'] = {'$ne': True}
        
        lists_data = list(shopping_lists_collection.find(query).sort('createdAt', 1))
        return [cls(list_data) for list_data in lists_data]
    
    @classmethod
    def find_by_id(cls, list_id: str, user_id: str) -> Optional['ShoppingList']:
        """Find shopping list by ID and user ID"""
        shopping_lists_collection = db.get_collection('shopping_lists')
        list_data = shopping_lists_collection.find_one({
            '_id': ObjectId(list_id),
            'user_id': ObjectId(user_id)
        })
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
        """Archive the shopping list"""
        self.update({'archived': True})
    
    def unarchive(self) -> None:
        """Unarchive the shopping list"""
        self.update({'archived': False})
    
    def delete(self) -> None:
        """Delete the shopping list"""
        shopping_lists_collection = db.get_collection('shopping_lists')
        shopping_lists_collection.delete_one({'_id': self.data['_id']})
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        result = self.data.copy()
        result['_id'] = str(result['_id'])
        result['user_id'] = str(result['user_id'])
        
        # Timestamps are already Unix integers, no conversion needed
        
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
