from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from home_models import Home, HomeInvitation
from models import User
from middleware import validate_json, auth_required
from bson import ObjectId
import re

home_bp = Blueprint('home', __name__, url_prefix='/api/homes')

def validate_email(email: str) -> bool:
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

@home_bp.route('', methods=['GET'])
@auth_required
def get_user_homes():
    """Get all homes where the user is a member"""
    try:
        user_id = get_jwt_identity()
        homes = Home.find_by_user_id(user_id)
        
        return jsonify({
            'homes': [home.to_dict() for home in homes]
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Get user homes error: {e}")
        return jsonify({'message': 'Failed to get homes'}), 500

@home_bp.route('', methods=['POST'])
@auth_required
@validate_json('name')
def create_home():
    """Create a new home"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        name = data['name'].strip()
        description = data.get('description', '').strip()
        
        if not name:
            return jsonify({'message': 'Home name is required'}), 400
        
        if len(name) > 100:
            return jsonify({'message': 'Home name too long (max 100 characters)'}), 400
        
        home = Home.create(user_id, name, description)
        
        return jsonify({
            'message': 'Home created successfully',
            'home': home.to_dict()
        }), 201
        
    except Exception as e:
        current_app.logger.error(f"Create home error: {e}")
        return jsonify({'message': 'Failed to create home'}), 500

@home_bp.route('/<home_id>', methods=['GET'])
@auth_required
def get_home(home_id):
    """Get a specific home"""
    try:
        user_id = get_jwt_identity()
        
        home = Home.find_by_id(home_id)
        if not home:
            return jsonify({'message': 'Home not found'}), 404
        
        if not home.is_member(user_id):
            return jsonify({'message': 'Access denied'}), 403
        
        return jsonify({
            'home': home.to_dict()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Get home error: {e}")
        return jsonify({'message': 'Failed to get home'}), 500

@home_bp.route('/<home_id>', methods=['PUT'])
@auth_required
def update_home(home_id):
    """Update a home (creator only)"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        home = Home.find_by_id(home_id)
        if not home:
            return jsonify({'message': 'Home not found'}), 404
        
        if not home.is_creator(user_id):
            return jsonify({'message': 'Only the home creator can update the home'}), 403
        
        update_data = {}
        if 'name' in data:
            name = data['name'].strip()
            if not name:
                return jsonify({'message': 'Home name cannot be empty'}), 400
            if len(name) > 100:
                return jsonify({'message': 'Home name too long (max 100 characters)'}), 400
            update_data['name'] = name
        
        if 'description' in data:
            update_data['description'] = data['description'].strip()
        
        if update_data:
            home.update(update_data)
        
        return jsonify({
            'message': 'Home updated successfully',
            'home': home.to_dict()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Update home error: {e}")
        return jsonify({'message': 'Failed to update home'}), 500

@home_bp.route('/<home_id>', methods=['DELETE'])
@auth_required
def delete_home(home_id):
    """Delete a home (creator only)"""
    try:
        user_id = get_jwt_identity()
        
        home = Home.find_by_id(home_id)
        if not home:
            return jsonify({'message': 'Home not found'}), 404
        
        if not home.is_creator(user_id):
            return jsonify({'message': 'Only the home creator can delete the home'}), 403
        
        # TODO: Handle what happens to shopping lists in this home
        # For now, we'll move them back to personal lists
        from shopping_models import ShoppingList
        shopping_lists_collection = ShoppingList.find_by_user_id(user_id, home_id=home_id)
        for shopping_list in shopping_lists_collection:
            shopping_list.update({'home_id': None})
        
        home.delete()
        
        return jsonify({
            'message': 'Home deleted successfully'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Delete home error: {e}")
        return jsonify({'message': 'Failed to delete home'}), 500

@home_bp.route('/<home_id>/leave', methods=['POST'])
@auth_required
def leave_home(home_id):
    """Leave a home"""
    try:
        user_id = get_jwt_identity()
        
        home = Home.find_by_id(home_id)
        if not home:
            return jsonify({'message': 'Home not found'}), 404
        
        if home.is_creator(user_id):
            return jsonify({'message': 'Home creator cannot leave the home. Transfer ownership or delete the home instead'}), 400
        
        if not home.is_member(user_id):
            return jsonify({'message': 'You are not a member of this home'}), 400
        
        success = home.remove_member(user_id)
        if not success:
            return jsonify({'message': 'Failed to leave home'}), 500
        
        return jsonify({
            'message': 'Successfully left the home'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Leave home error: {e}")
        return jsonify({'message': 'Failed to leave home'}), 500

@home_bp.route('/<home_id>/invite', methods=['POST'])
@auth_required
@validate_json('email')
def invite_user_to_home(home_id):
    """Invite a user to join a home"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        email = data['email'].strip().lower()
        message = data.get('message', '').strip()
        
        if not validate_email(email):
            return jsonify({'message': 'Invalid email format'}), 400
        
        home = Home.find_by_id(home_id)
        if not home:
            return jsonify({'message': 'Home not found'}), 404
        
        if not home.is_creator(user_id):
            return jsonify({'message': 'Only the home creator can invite users'}), 403
        
        # Check if user exists and get their ID
        invited_user = User.find_by_email(email)
        invited_user_id = invited_user.id if invited_user else None
        
        # Check if user is already a member
        if invited_user_id and home.is_member(invited_user_id):
            return jsonify({'message': 'User is already a member of this home'}), 400
        
        # Check if there's already a pending invitation
        existing_invitation = HomeInvitation.check_existing_invitation(home_id, email, 'invite')
        if existing_invitation:
            return jsonify({'message': 'An invitation has already been sent to this user'}), 400
        
        # Create invitation
        invitation = HomeInvitation.create(
            home_id=home_id,
            from_user_id=user_id,
            to_user_email=email,
            invitation_type='invite',
            message=message,
            to_user_id=invited_user_id
        )
        
        # TODO: Send email notification (placeholder for future implementation)
        # await send_home_invitation_email(email, home.data['name'], message)
        
        return jsonify({
            'message': 'Invitation sent successfully',
            'invitation': invitation.to_dict()
        }), 201
        
    except Exception as e:
        current_app.logger.error(f"Invite user error: {e}")
        return jsonify({'message': 'Failed to send invitation'}), 500

@home_bp.route('/<home_id>/request-join', methods=['POST'])
@auth_required
def request_join_home(home_id):
    """Request to join a home"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json() or {}
        
        message = data.get('message', '').strip()
        
        home = Home.find_by_id(home_id)
        if not home:
            return jsonify({'message': 'Home not found'}), 404
        
        # Check if user is already a member
        if home.is_member(user_id):
            return jsonify({'message': 'You are already a member of this home'}), 400
        
        # Get user's email
        user = User.find_by_id(user_id)
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        # Get home creator's email for the invitation
        creator = User.find_by_id(home.data['creator_id'])
        if not creator:
            return jsonify({'message': 'Home creator not found'}), 404
        
        # Check if there's already a pending request from this user
        existing_request = HomeInvitation.check_existing_request_from_user(home_id, user_id, 'request')
        if existing_request:
            return jsonify({'message': 'You have already requested to join this home'}), 400
        
        # Create join request - sent TO the home creator FROM the requesting user
        invitation = HomeInvitation.create(
            home_id=home_id,
            from_user_id=user_id,  # User requesting to join
            to_user_email=creator.data['email'],  # Home creator receives the request
            invitation_type='request',
            message=message,
            to_user_id=home.data['creator_id']  # Home creator ID
        )
        
        # TODO: Send notification to home creator (placeholder for future implementation)
        # await send_join_request_notification(home.data['creator_id'], user.data['name'], home.data['name'])
        
        return jsonify({
            'message': 'Join request sent successfully',
            'invitation': invitation.to_dict()
        }), 201
        
    except Exception as e:
        current_app.logger.error(f"Request join home error: {e}")
        return jsonify({'message': 'Failed to send join request'}), 500

@home_bp.route('/<home_id>/members', methods=['GET'])
@auth_required
def get_home_members(home_id):
    """Get members of a home"""
    try:
        user_id = get_jwt_identity()
        
        home = Home.find_by_id(home_id)
        if not home:
            return jsonify({'message': 'Home not found'}), 404
        
        if not home.is_member(user_id):
            return jsonify({'message': 'Access denied'}), 403
        
        # Get member details
        members = []
        for member_id in home.data['members']:
            member = User.find_by_id(str(member_id))
            if member:
                member_data = {
                    'id': member.id,
                    'name': member.data['name'],
                    'email': member.data['email'],
                    'photo': member.data.get('photo'),
                    'is_creator': str(member_id) == str(home.data['creator_id'])
                }
                members.append(member_data)
        
        return jsonify({
            'members': members
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Get home members error: {e}")
        return jsonify({'message': 'Failed to get home members'}), 500

@home_bp.route('/<home_id>/members/<member_id>', methods=['DELETE'])
@auth_required
def remove_member_from_home(home_id, member_id):
    """Remove a member from a home (creator only)"""
    try:
        user_id = get_jwt_identity()
        
        home = Home.find_by_id(home_id)
        if not home:
            return jsonify({'message': 'Home not found'}), 404
        
        if not home.is_creator(user_id):
            return jsonify({'message': 'Only the home creator can remove members'}), 403
        
        if str(home.data['creator_id']) == member_id:
            return jsonify({'message': 'Cannot remove the home creator'}), 400
        
        success = home.remove_member(member_id)
        if not success:
            return jsonify({'message': 'Failed to remove member or member not found'}), 400
        
        return jsonify({
            'message': 'Member removed successfully'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Remove member error: {e}")
        return jsonify({'message': 'Failed to remove member'}), 500

@home_bp.route('/invitations', methods=['GET'])
@auth_required
def get_user_invitations():
    """Get pending invitations for the current user"""
    try:
        user_id = get_jwt_identity()
        
        # Get user's email
        user = User.find_by_id(user_id)
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        invitations = HomeInvitation.find_pending_for_user(user_id, user.data['email'])
        
        # Enrich invitations with home and user data
        enriched_invitations = []
        for invitation in invitations:
            invitation_dict = invitation.to_dict()
            
            # Add home information
            home = Home.find_by_id(invitation_dict['home_id'])
            if home:
                invitation_dict['home'] = {
                    'id': home.id,
                    'name': home.data['name'],
                    'description': home.data.get('description', ''),
                    'member_count': home.get_member_count()
                }
            
            # Add sender information
            sender = User.find_by_id(invitation_dict['from_user_id'])
            if sender:
                invitation_dict['from_user'] = {
                    'id': sender.id,
                    'name': sender.data['name'],
                    'email': sender.data['email']
                }
            
            enriched_invitations.append(invitation_dict)
        
        return jsonify({
            'invitations': enriched_invitations
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Get user invitations error: {e}")
        return jsonify({'message': 'Failed to get invitations'}), 500

@home_bp.route('/invitations/<invitation_id>/respond', methods=['PUT'])
@auth_required
@validate_json('action')
def respond_to_invitation(invitation_id):
    """Accept or reject a home invitation"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        action = data['action'].lower()
        if action not in ['accept', 'reject']:
            return jsonify({'message': 'Action must be "accept" or "reject"'}), 400
        
        invitation = HomeInvitation.find_by_id(invitation_id)
        if not invitation:
            return jsonify({'message': 'Invitation not found'}), 404
        
        # Get user's email to verify invitation is for them
        user = User.find_by_id(user_id)
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        # Verify invitation is for this user
        if (invitation.data['to_user_email'] != user.data['email'] and 
            invitation.data.get('to_user_id') != ObjectId(user_id)):
            return jsonify({'message': 'This invitation is not for you'}), 403
        
        home = Home.find_by_id(invitation.data['home_id'])
        if not home:
            return jsonify({'message': 'Home not found'}), 404
        
        if action == 'accept':
            # For invites: add user to home
            # For requests: this is handled by the home creator
            if invitation.data['type'] == 'invite':
                success = home.add_member(user_id)
                if not success:
                    return jsonify({'message': 'You are already a member of this home'}), 400
                
                invitation.accept()
                message = f'Successfully joined {home.data["name"]}'
            else:
                return jsonify({'message': 'Join requests must be accepted by the home creator'}), 400
        else:
            invitation.reject()
            message = 'Invitation rejected'
        
        return jsonify({
            'message': message
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Respond to invitation error: {e}")
        return jsonify({'message': 'Failed to respond to invitation'}), 500

@home_bp.route('/pending-requests', methods=['GET'])
@auth_required
def get_pending_requests():
    """Get pending join requests for homes created by the current user"""
    try:
        user_id = get_jwt_identity()
        
        # Get homes created by this user
        user_homes = Home.find_by_creator_id(user_id)
        
        pending_requests = []
        for home in user_homes:
            requests = HomeInvitation.find_pending_for_home(home.id)
            
            for request in requests:
                if request.data['type'] == 'request':  # Only join requests, not invites
                    request_dict = request.to_dict()
                    request_dict['home'] = {
                        'id': home.id,
                        'name': home.data['name'],
                        'description': home.data.get('description', '')
                    }
                    
                    # Add requester information
                    requester = User.find_by_id(request_dict['from_user_id'])
                    if requester:
                        request_dict['from_user'] = {
                            'id': requester.id,
                            'name': requester.data['name'],
                            'email': requester.data['email']
                        }
                    
                    pending_requests.append(request_dict)
        
        return jsonify({
            'requests': pending_requests
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Get pending requests error: {e}")
        return jsonify({'message': 'Failed to get pending requests'}), 500

@home_bp.route('/requests/<request_id>/respond', methods=['PUT'])
@auth_required
@validate_json('action')
def respond_to_join_request(request_id):
    """Accept or reject a join request (home creator only)"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        action = data['action'].lower()
        if action not in ['accept', 'reject']:
            return jsonify({'message': 'Action must be "accept" or "reject"'}), 400
        
        request_invitation = HomeInvitation.find_by_id(request_id)
        if not request_invitation:
            return jsonify({'message': 'Request not found'}), 404
        
        if request_invitation.data['type'] != 'request':
            return jsonify({'message': 'This is not a join request'}), 400
        
        home = Home.find_by_id(request_invitation.data['home_id'])
        if not home:
            return jsonify({'message': 'Home not found'}), 404
        
        if not home.is_creator(user_id):
            return jsonify({'message': 'Only the home creator can respond to join requests'}), 403
        
        if action == 'accept':
            # Add user to home
            requester_id = str(request_invitation.data['from_user_id'])
            success = home.add_member(requester_id)
            if not success:
                return jsonify({'message': 'User is already a member of this home'}), 400
            
            request_invitation.accept()
            message = 'Join request accepted'
        else:
            request_invitation.reject()
            message = 'Join request rejected'
        
        return jsonify({
            'message': message
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Respond to join request error: {e}")
        return jsonify({'message': 'Failed to respond to join request'}), 500
