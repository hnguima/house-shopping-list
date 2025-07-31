from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from shopping_models import ShoppingList, ShoppingListStats
from middleware import validate_json, auth_required
from bson import ObjectId
from datetime import datetime

shopping_bp = Blueprint('shopping', __name__, url_prefix='/api/shopping')

@shopping_bp.route('/sync-check', methods=['GET'])
@auth_required
def check_shopping_sync_status():
    """Get timestamp information for all user's shopping lists for sync purposes"""
    try:
        user_id = get_jwt_identity()
        include_archived = request.args.get('include_archived', 'false').lower() == 'true'
        
        # Get only the timestamps, not full data
        shopping_lists = ShoppingList.find_by_user_id(user_id, include_archived)
        
        # Return only list IDs and timestamps
        timestamps = []
        for sl in shopping_lists:
            timestamps.append({
                '_id': str(sl.id),
                'updatedAt': sl.data.get('updatedAt', 0)
            })
        
        return jsonify({
            'lists': timestamps
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Shopping sync check error: {e}")
        return jsonify({'message': 'Failed to check shopping sync status'}), 500

@shopping_bp.route('/lists', methods=['GET'])
@auth_required
def get_shopping_lists():
    """Get all shopping lists for the current user"""
    try:
        user_id = get_jwt_identity()
        include_archived = request.args.get('include_archived', 'false').lower() == 'true'
        
        shopping_lists = ShoppingList.find_by_user_id(user_id, include_archived)
        
        return jsonify({
            'shopping_lists': [sl.to_dict() for sl in shopping_lists]
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Get shopping lists error: {e}")
        return jsonify({'message': 'Failed to get shopping lists'}), 500

@shopping_bp.route('/lists', methods=['POST'])
@auth_required
@validate_json('name')
def create_shopping_list():
    """Create a new shopping list"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        current_app.logger.info(f"Creating shopping list for user {user_id}: {data}")
        
        name = data['name'].strip()
        description = data.get('description', '').strip()
        color = data.get('color', '#1976d2')  # Default to Material-UI primary blue
        list_id = data.get('_id')  # Accept custom ID from frontend
        items = data.get('items', [])  # Accept items array from frontend
        
        if not name:
            return jsonify({'message': 'Shopping list name is required'}), 400
        
        current_app.logger.info(f"About to create shopping list: name={name}, desc={description}, color={color}, id={list_id}, items_count={len(items)}")
        shopping_list = ShoppingList.create(user_id, name, description, color, list_id, items)
        current_app.logger.info(f"Shopping list created with ID: {shopping_list.id}")
        
        result = jsonify({
            'message': 'Shopping list created successfully',
            'shopping_list': shopping_list.to_dict()
        })
        
        current_app.logger.info(f"Returning shopping list data: {shopping_list.to_dict()}")
        return result, 201
        
    except Exception as e:
        current_app.logger.error(f"Create shopping list error: {e}")
        return jsonify({'message': 'Failed to create shopping list'}), 500

@shopping_bp.route('/lists/<list_id>', methods=['GET'])
@auth_required
def get_shopping_list(list_id):
    """Get a specific shopping list"""
    try:
        user_id = get_jwt_identity()
        
        # Accept both MongoDB ObjectIds and custom frontend-generated IDs
        if not (ObjectId.is_valid(list_id) or '_' in list_id):
            return jsonify({'message': 'Invalid list ID'}), 400
        
        shopping_list = ShoppingList.find_by_id(list_id, user_id)
        
        if not shopping_list:
            return jsonify({'message': 'Shopping list not found'}), 404
        
        return jsonify({
            'shopping_list': shopping_list.to_dict()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Get shopping list error: {e}")
        return jsonify({'message': 'Failed to get shopping list'}), 500

@shopping_bp.route('/lists/<list_id>', methods=['PUT'])
@auth_required
def update_shopping_list(list_id):
    """Update a shopping list"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # Accept both MongoDB ObjectIds and custom frontend-generated IDs
        if not (ObjectId.is_valid(list_id) or '_' in list_id):
            return jsonify({'message': 'Invalid list ID'}), 400
        
        shopping_list = ShoppingList.find_by_id(list_id, user_id)
        
        if not shopping_list:
            return jsonify({'message': 'Shopping list not found'}), 404
        
        # Validate update data
        update_data = {}
        if 'name' in data:
            name = data['name'].strip()
            if not name:
                return jsonify({'message': 'Shopping list name cannot be empty'}), 400
            update_data['name'] = name
        
        if 'description' in data:
            update_data['description'] = data['description'].strip()
        
        if 'color' in data:
            update_data['color'] = data['color']
        
        if 'archived' in data:
            update_data['archived'] = bool(data['archived'])
        
        if 'items' in data:
            update_data['items'] = data['items']  # Accept entire items array
        
        shopping_list.update(update_data)
        
        return jsonify({
            'message': 'Shopping list updated successfully',
            'shopping_list': shopping_list.to_dict()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Update shopping list error: {e}")
        return jsonify({'message': 'Failed to update shopping list'}), 500

@shopping_bp.route('/lists/<list_id>', methods=['DELETE'])
@auth_required
def delete_shopping_list(list_id):
    """Delete a shopping list"""
    try:
        user_id = get_jwt_identity()
        
        # Accept both MongoDB ObjectIds and custom frontend-generated IDs
        if not (ObjectId.is_valid(list_id) or '_' in list_id):
            return jsonify({'message': 'Invalid list ID'}), 400
        
        shopping_list = ShoppingList.find_by_id(list_id, user_id)
        
        if not shopping_list:
            return jsonify({'message': 'Shopping list not found'}), 404
        
        shopping_list.delete()
        
        return jsonify({
            'message': 'Shopping list deleted successfully'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Delete shopping list error: {e}")
        return jsonify({'message': 'Failed to delete shopping list'}), 500

@shopping_bp.route('/lists/<list_id>/archive', methods=['POST'])
@auth_required
def archive_shopping_list(list_id):
    """Archive a shopping list"""
    try:
        user_id = get_jwt_identity()
        
        # Accept both MongoDB ObjectIds and custom frontend-generated IDs
        if not (ObjectId.is_valid(list_id) or '_' in list_id):
            return jsonify({'message': 'Invalid list ID'}), 400
        
        shopping_list = ShoppingList.find_by_id(list_id, user_id)
        
        if not shopping_list:
            return jsonify({'message': 'Shopping list not found'}), 404
        
        shopping_list.archive()
        
        return jsonify({
            'message': 'Shopping list archived successfully',
            'shopping_list': shopping_list.to_dict()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Archive shopping list error: {e}")
        return jsonify({'message': 'Failed to archive shopping list'}), 500

@shopping_bp.route('/lists/<list_id>/unarchive', methods=['POST'])
@auth_required
def unarchive_shopping_list(list_id):
    """Unarchive a shopping list"""
    try:
        user_id = get_jwt_identity()
        
        # Accept both MongoDB ObjectIds and custom frontend-generated IDs
        if not (ObjectId.is_valid(list_id) or '_' in list_id):
            return jsonify({'message': 'Invalid list ID'}), 400
        
        shopping_list = ShoppingList.find_by_id(list_id, user_id)
        
        if not shopping_list:
            return jsonify({'message': 'Shopping list not found'}), 404
        
        shopping_list.unarchive()
        
        return jsonify({
            'message': 'Shopping list unarchived successfully',
            'shopping_list': shopping_list.to_dict()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Unarchive shopping list error: {e}")
        return jsonify({'message': 'Failed to unarchive shopping list'}), 500

# REMOVED: Individual item routes - using simple items array sync instead
# Items are now synced as a complete array in the shopping list update endpoint

# @shopping_bp.route('/lists/<list_id>/items', methods=['POST'])
# @auth_required
# @validate_json('name')
# def add_item_to_list(list_id):
#     """Add an item to a shopping list"""
#     [Individual item management routes removed - items synced as array]

# @shopping_bp.route('/lists/<list_id>/items/<item_id>', methods=['PUT'])
# @auth_required  
# def update_item_in_list(list_id, item_id):
#     """Update an item in a shopping list"""
#     [Individual item management routes removed - items synced as array]

# @shopping_bp.route('/lists/<list_id>/items/<item_id>', methods=['DELETE'])
# @auth_required
# def remove_item_from_list(list_id, item_id):
#     """Remove an item from a shopping list"""
#     [Individual item management routes removed - items synced as array]

# Statistics Routes

@shopping_bp.route('/stats', methods=['GET'])
@auth_required
def get_user_stats():
    """Get shopping list statistics for the current user"""
    try:
        user_id = get_jwt_identity()
        stats = ShoppingListStats.get_user_stats(user_id)
        
        return jsonify({
            'stats': stats
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Get stats error: {e}")
        return jsonify({'message': 'Failed to get statistics'}), 500
