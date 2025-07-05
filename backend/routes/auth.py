from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from pydantic import ValidationError
from schemas import UserRegistration, UserLogin, TokenResponse, ApiResponse
from auth import login_user, register_user, get_user_from_token
import logging

# Create blueprint
auth_bp = Blueprint('auth', __name__)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@auth_bp.route('/signup', methods=['POST'])
def signup():
    """
    User registration endpoint
    """
    try:
        # Parse request data
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        # Validate input using Pydantic
        try:
            user_data = UserRegistration(**data)
        except ValidationError as e:
            return jsonify({
                'success': False,
                'message': 'Validation error',
                'errors': [error['msg'] for error in e.errors()]
            }), 400
        
        # Register user
        result, error = register_user(
            name=user_data.name,
            email=user_data.email,
            password=user_data.password,
            role=user_data.role.value,
            department=user_data.department
        )
        
        if error:
            return jsonify({
                'success': False,
                'message': error
            }), 400
        
        # Log successful registration
        logger.info(f"New user registered: {user_data.email} with role {user_data.role.value}")
        
        return jsonify({
            'success': True,
            'message': 'User registered successfully',
            'data': result
        }), 201
        
    except Exception as e:
        logger.error(f"Signup error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Registration failed due to server error'
        }), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """
    User login endpoint
    """
    try:
        # Parse request data
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        # Validate input using Pydantic
        try:
            login_data = UserLogin(**data)
        except ValidationError as e:
            return jsonify({
                'success': False,
                'message': 'Validation error',
                'errors': [error['msg'] for error in e.errors()]
            }), 400
        
        # Authenticate user
        result, error = login_user(
            email=login_data.email,
            password=login_data.password
        )
        
        if error:
            return jsonify({
                'success': False,
                'message': error
            }), 401
        
        # Log successful login
        logger.info(f"User logged in: {login_data.email}")
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'data': result
        }), 200
        
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Login failed due to server error'
        }), 500

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user_info():
    """
    Get current user information from JWT token
    """
    try:
        user_info = get_user_from_token()
        if not user_info:
            return jsonify({
                'success': False,
                'message': 'Invalid token or user not found'
            }), 401
        
        return jsonify({
            'success': True,
            'message': 'User information retrieved successfully',
            'data': user_info
        }), 200
        
    except Exception as e:
        logger.error(f"Get user info error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to retrieve user information'
        }), 500

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh_token():
    """
    Refresh access token using refresh token
    """
    try:
        from flask_jwt_extended import create_access_token
        from datetime import timedelta
        
        current_user_email = get_jwt_identity()
        if not current_user_email:
            return jsonify({
                'success': False,
                'message': 'Invalid refresh token'
            }), 401
        
        # Get user info for additional claims
        user_info = get_user_from_token()
        if not user_info:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 401
        
        # Create new access token
        additional_claims = {
            "user_id": user_info['id'],
            "name": user_info['name'],
            "role": user_info['role'],
            "department": user_info['department']
        }
        
        new_access_token = create_access_token(
            identity=current_user_email,
            additional_claims=additional_claims,
            expires_delta=timedelta(days=1)
        )
        
        return jsonify({
            'success': True,
            'message': 'Token refreshed successfully',
            'data': {
                'access_token': new_access_token
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Token refresh error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Token refresh failed'
        }), 500

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """
    Logout endpoint (client-side token removal)
    """
    try:
        # In a more sophisticated implementation, you might want to:
        # 1. Add token to a blacklist
        # 2. Store logout event in database
        # 3. Clean up any session data
        
        user_info = get_user_from_token()
        if user_info:
            logger.info(f"User logged out: {user_info['email']}")
        
        return jsonify({
            'success': True,
            'message': 'Logout successful'
        }), 200
        
    except Exception as e:
        logger.error(f"Logout error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Logout failed'
        }), 500

@auth_bp.route('/validate', methods=['GET'])
@jwt_required()
def validate_token():
    """
    Validate JWT token endpoint
    """
    try:
        user_info = get_user_from_token()
        if not user_info:
            return jsonify({
                'success': False,
                'message': 'Invalid token'
            }), 401
        
        return jsonify({
            'success': True,
            'message': 'Token is valid',
            'data': {
                'valid': True,
                'user': user_info
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Token validation error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Token validation failed'
        }), 500

# Error handlers for this blueprint
@auth_bp.errorhandler(400)
def bad_request(error):
    return jsonify({
        'success': False,
        'message': 'Bad request'
    }), 400

@auth_bp.errorhandler(401)
def unauthorized(error):
    return jsonify({
        'success': False,
        'message': 'Unauthorized access'
    }), 401

@auth_bp.errorhandler(403)
def forbidden(error):
    return jsonify({
        'success': False,
        'message': 'Access forbidden'
    }), 403

@auth_bp.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'message': 'Internal server error'
    }), 500
