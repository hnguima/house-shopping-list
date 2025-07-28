from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import User
from middleware import auth_required, validate_json
import base64
import os
from datetime import datetime

user_bp = Blueprint('user', __name__, url_prefix='/api/user')

@user_bp.route('/sync-check', methods=['GET'])
@auth_required
def check_sync_status():
    """Check user's last update timestamp for sync purposes"""
    try:
        current_user_id = get_jwt_identity()
        user = User.find_by_id(current_user_id)
        
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        # Handle users without updatedAt field (for backwards compatibility)
        updated_at = user.data.get('updatedAt')
        if not updated_at:
            # Set updatedAt to current time for existing users
            user.update({})  # This will automatically set updatedAt
            updated_at = user.data['updatedAt']
        
        response_data = {
            'updatedAt': updated_at,  # updated_at is already a Unix timestamp (int)
            'userId': str(user.id)
        }
        
        current_app.logger.info(f"Sync check response: {response_data}")
        return jsonify(response_data), 200
        
    except Exception as e:
        current_app.logger.error(f"Sync check error: {e}")
        return jsonify({'message': 'Failed to check sync status'}), 500

@user_bp.route('/profile', methods=['GET'])
@auth_required
def get_profile():
    """Get user profile"""
    try:
        user = User.find_by_id(get_jwt_identity())
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        # Handle users without updatedAt field (for backwards compatibility)
        if not user.data.get('updatedAt'):
            user.update({})  # This will set updatedAt
        
        return jsonify({'user': user.to_dict()}), 200
        
    except Exception as e:
        current_app.logger.error(f"Get profile error: {e}")
        return jsonify({'message': 'Failed to get profile'}), 500

@user_bp.route('/profile', methods=['PUT'])
@auth_required
def update_profile():
    """Update user profile"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'message': 'No data provided'}), 400
        
        user = User.find_by_id(get_jwt_identity())
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        # Allowed fields for update
        allowed_fields = ['name', 'preferences', 'photo']
        update_data = {}
        
        for field in allowed_fields:
            if field in data:
                update_data[field] = data[field]
        
        if update_data:
            user.update(update_data)
        
        return jsonify({
            'message': 'Profile updated successfully',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Update profile error: {e}")
        return jsonify({'message': 'Failed to update profile'}), 500

@user_bp.route('/upload-photo', methods=['POST'])
@auth_required
def upload_photo():
    """Upload user profile photo"""
    try:
        data = request.get_json()
        if not data or 'photo' not in data:
            return jsonify({'message': 'No photo data provided'}), 400
        
        photo_data = data['photo']
        
        # Validate base64 format
        if not photo_data.startswith('data:image/'):
            return jsonify({'message': 'Invalid photo format'}), 400
        
        # Extract base64 data
        try:
            header, base64_data = photo_data.split(',', 1)
            photo_bytes = base64.b64decode(base64_data)
        except Exception:
            return jsonify({'message': 'Invalid base64 photo data'}), 400
        
        # Validate file size (5MB limit)
        max_size = 5 * 1024 * 1024  # 5MB
        if len(photo_bytes) > max_size:
            return jsonify({'message': 'Photo size exceeds 5MB limit'}), 400
        
        user = User.find_by_id(get_jwt_identity())
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        # In a production environment, you would upload to a cloud storage service
        # For now, we'll store the base64 data directly
        user.update({'photo': photo_data})
        
        return jsonify({
            'message': 'Photo uploaded successfully',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Upload photo error: {e}")
        return jsonify({'message': 'Failed to upload photo'}), 500
