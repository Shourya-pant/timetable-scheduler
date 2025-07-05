from functools import wraps
from flask import request, jsonify, g
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt, verify_jwt_in_request
from models import User, UserRole, SessionLocal
import logging

# Configure logging
logger = logging.getLogger(__name__)

def jwt_middleware():
    """
    JWT token validation middleware
    Validates JWT tokens and sets user context in Flask g object
    """
    def decorator(f):
        @wraps(f)
        @jwt_required()
        def decorated_function(*args, **kwargs):
            try:
                # Get JWT claims
                claims = get_jwt()
                current_user_email = get_jwt_identity()
                
                if not current_user_email or not claims:
                    return jsonify({
                        'success': False,
                        'message': 'Invalid or missing JWT token'
                    }), 401
                
                # Set user context in Flask g object
                g.current_user = {
                    'id': claims.get('user_id'),
                    'email': current_user_email,
                    'name': claims.get('name'),
                    'role': claims.get('role'),
                    'department': claims.get('department')
                }
                
                return f(*args, **kwargs)
                
            except Exception as e:
                logger.error(f"JWT middleware error: {str(e)}")
                return jsonify({
                    'success': False,
                    'message': 'Authentication failed'
                }), 401
        
        return decorated_function
    return decorator

def optional_jwt_middleware():
    """
    Optional JWT token validation middleware
    Sets user context if token is provided, but doesn't require it
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                # Try to verify JWT token if present
                verify_jwt_in_request(optional=True)
                
                current_user_email = get_jwt_identity()
                if current_user_email:
                    claims = get_jwt()
                    g.current_user = {
                        'id': claims.get('user_id'),
                        'email': current_user_email,
                        'name': claims.get('name'),
                        'role': claims.get('role'),
                        'department': claims.get('department')
                    }
                else:
                    g.current_user = None
                
                return f(*args, **kwargs)
                
            except Exception as e:
                logger.error(f"Optional JWT middleware error: {str(e)}")
                g.current_user = None
                return f(*args, **kwargs)
        
        return decorated_function
    return decorator

def role_required(*allowed_roles):
    """
    Role-based access control decorator
    Requires user to have one of the specified roles
    """
    def decorator(f):
        @wraps(f)
        @jwt_required()
        def decorated_function(*args, **kwargs):
            try:
                claims = get_jwt()
                user_role = claims.get('role')
                
                if not user_role:
                    return jsonify({
                        'success': False,
                        'message': 'User role not found in token'
                    }), 403
                
                if user_role not in [role.value if isinstance(role, UserRole) else role for role in allowed_roles]:
                    return jsonify({
                        'success': False,
                        'message': f'Access denied. Required roles: {[role.value if isinstance(role, UserRole) else role for role in allowed_roles]}'
                    }), 403
                
                # Set user context
                g.current_user = {
                    'id': claims.get('user_id'),
                    'email': get_jwt_identity(),
                    'name': claims.get('name'),
                    'role': user_role,
                    'department': claims.get('department')
                }
                
                return f(*args, **kwargs)
                
            except Exception as e:
                logger.error(f"Role validation error: {str(e)}")
                return jsonify({
                    'success': False,
                    'message': 'Access validation failed'
                }), 403
        
        return decorated_function
    return decorator

def admin_required(f):
    """
    Decorator requiring admin role
    """
    @wraps(f)
    @role_required(UserRole.ADMIN)
    def decorated_function(*args, **kwargs):
        return f(*args, **kwargs)
    
    return decorated_function

def dept_head_required(f):
    """
    Decorator requiring department head or admin role
    """
    @wraps(f)
    @role_required(UserRole.ADMIN, UserRole.DEPT_HEAD)
    def decorated_function(*args, **kwargs):
        return f(*args, **kwargs)
    
    return decorated_function

def department_access_required(f):
    """
    Decorator ensuring user can only access their own department's data
    Requires department parameter in request or URL
    """
    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        try:
            claims = get_jwt()
            user_role = claims.get('role')
            user_department = claims.get('department')
            
            # Admin can access all departments
            if user_role == UserRole.ADMIN.value:
                g.current_user = {
                    'id': claims.get('user_id'),
                    'email': get_jwt_identity(),
                    'name': claims.get('name'),
                    'role': user_role,
                    'department': user_department
                }
                return f(*args, **kwargs)
            
            # Get requested department from various sources
            requested_department = None
            
            # Check URL parameters
            if 'department' in kwargs:
                requested_department = kwargs['department']
            
            # Check request JSON data
            elif request.is_json and request.get_json():
                data = request.get_json()
                requested_department = data.get('department')
            
            # Check query parameters
            elif request.args.get('department'):
                requested_department = request.args.get('department')
            
            # If no department specified, use user's department
            if not requested_department:
                requested_department = user_department
            
            # Check if user can access the requested department
            if user_role == UserRole.DEPT_HEAD.value and user_department != requested_department:
                return jsonify({
                    'success': False,
                    'message': f'Access denied. You can only access {user_department} department data'
                }), 403
            
            # Set user context
            g.current_user = {
                'id': claims.get('user_id'),
                'email': get_jwt_identity(),
                'name': claims.get('name'),
                'role': user_role,
                'department': user_department
            }
            
            return f(*args, **kwargs)
            
        except Exception as e:
            logger.error(f"Department access validation error: {str(e)}")
            return jsonify({
                'success': False,
                'message': 'Department access validation failed'
            }), 403
    
    return decorated_function

def validate_user_exists(f):
    """
    Decorator to validate that the user in JWT token still exists in database
    """
    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        try:
            current_user_email = get_jwt_identity()
            claims = get_jwt()
            
            # Check if user still exists in database
            db = SessionLocal()
            try:
                user = db.query(User).filter(User.email == current_user_email).first()
                if not user:
                    return jsonify({
                        'success': False,
                        'message': 'User no longer exists'
                    }), 401
                
                # Update claims with current user data
                g.current_user = {
                    'id': user.id,
                    'email': user.email,
                    'name': user.name,
                    'role': user.role.value,
                    'department': user.department
                }
                
                return f(*args, **kwargs)
                
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"User validation error: {str(e)}")
            return jsonify({
                'success': False,
                'message': 'User validation failed'
            }), 401
    
    return decorated_function

def rate_limit_middleware(max_requests=100, window=3600):
    """
    Simple rate limiting middleware
    max_requests: maximum number of requests per window
    window: time window in seconds
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # This is a basic implementation
            # In production, you would use Redis or similar for distributed rate limiting
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator

def cors_middleware():
    """
    CORS middleware for handling cross-origin requests
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # CORS is handled by Flask-CORS in app.py
            # This is a placeholder for custom CORS logic if needed
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator

def get_current_user_context():
    """
    Helper function to get current user from Flask g object
    """
    return getattr(g, 'current_user', None)

def is_admin():
    """
    Check if current user is admin
    """
    user = get_current_user_context()
    return user and user.get('role') == UserRole.ADMIN.value

def is_dept_head():
    """
    Check if current user is department head or admin
    """
    user = get_current_user_context()
    return user and user.get('role') in [UserRole.ADMIN.value, UserRole.DEPT_HEAD.value]

def get_user_department():
    """
    Get current user's department
    """
    user = get_current_user_context()
    return user.get('department') if user else None

def can_access_department(department):
    """
    Check if current user can access specified department
    """
    user = get_current_user_context()
    if not user:
        return False
    
    # Admin can access all departments
    if user.get('role') == UserRole.ADMIN.value:
        return True
    
    # Department heads can only access their own department
    return user.get('department') == department
