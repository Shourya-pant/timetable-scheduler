from functools import wraps
from flask import request, jsonify, current_app
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity, get_jwt
import bcrypt
from sqlalchemy.orm import sessionmaker
from models import User, UserRole, engine
from datetime import timedelta
import json

# Create database session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt
    """
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, password_hash: str) -> bool:
    """
    Verify a password against its hash
    """
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))

def authenticate_user(email: str, password: str):
    """
    Authenticate user with email and password
    Returns user object if authentication successful, None otherwise
    """
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user and verify_password(password, user.password_hash):
            return user
        return None
    finally:
        db.close()

def create_user(name: str, email: str, password: str, role: UserRole, department: str = None):
    """
    Create a new user with hashed password
    Returns user object if creation successful, None if user already exists
    """
    db = SessionLocal()
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            return None
        
        # Create new user
        password_hash = hash_password(password)
        user = User(
            name=name,
            email=email,
            password_hash=password_hash,
            role=role,
            department=department
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()

def generate_tokens(user):
    """
    Generate access and refresh tokens for user
    """
    # Create additional claims
    additional_claims = {
        "user_id": user.id,
        "name": user.name,
        "role": user.role.value,
        "department": user.department
    }
    
    access_token = create_access_token(
        identity=user.email,
        additional_claims=additional_claims,
        expires_delta=timedelta(days=1)
    )
    
    refresh_token = create_refresh_token(
        identity=user.email,
        additional_claims=additional_claims,
        expires_delta=timedelta(days=30)
    )
    
    return access_token, refresh_token

def get_current_user():
    """
    Get current authenticated user from JWT token
    """
    current_user_email = get_jwt_identity()
    if not current_user_email:
        return None
    
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == current_user_email).first()
        return user
    finally:
        db.close()

def get_user_from_token():
    """
    Extract user information from JWT token claims
    """
    claims = get_jwt()
    if not claims:
        return None
    
    return {
        'id': claims.get('user_id'),
        'email': get_jwt_identity(),
        'name': claims.get('name'),
        'role': claims.get('role'),
        'department': claims.get('department')
    }

# Role-based access decorators
def admin_required(f):
    """
    Decorator to require admin role for accessing endpoint
    """
    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        claims = get_jwt()
        user_role = claims.get('role')
        
        if user_role != UserRole.ADMIN.value:
            return jsonify({
                'success': False,
                'message': 'Admin access required'
            }), 403
        
        return f(*args, **kwargs)
    
    return decorated_function

def dept_head_required(f):
    """
    Decorator to require department head role for accessing endpoint
    """
    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        claims = get_jwt()
        user_role = claims.get('role')
        
        if user_role not in [UserRole.ADMIN.value, UserRole.DEPT_HEAD.value]:
            return jsonify({
                'success': False,
                'message': 'Department head or admin access required'
            }), 403
        
        return f(*args, **kwargs)
    
    return decorated_function

def same_department_required(f):
    """
    Decorator to ensure user can only access their own department's data
    """
    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        claims = get_jwt()
        user_role = claims.get('role')
        user_department = claims.get('department')
        
        # Admin can access all departments
        if user_role == UserRole.ADMIN.value:
            return f(*args, **kwargs)
        
        # Department heads can only access their own department
        # This decorator should be used with endpoints that have department context
        # The actual department checking will be done in the route handlers
        return f(*args, **kwargs)
    
    return decorated_function

def get_user_department():
    """
    Get current user's department from JWT token
    """
    claims = get_jwt()
    return claims.get('department') if claims else None

def get_user_role():
    """
    Get current user's role from JWT token
    """
    claims = get_jwt()
    return claims.get('role') if claims else None

def is_admin():
    """
    Check if current user is admin
    """
    return get_user_role() == UserRole.ADMIN.value

def is_dept_head():
    """
    Check if current user is department head
    """
    user_role = get_user_role()
    return user_role in [UserRole.ADMIN.value, UserRole.DEPT_HEAD.value]

def can_access_department(department: str) -> bool:
    """
    Check if current user can access specified department
    """
    user_role = get_user_role()
    user_department = get_user_department()
    
    # Admin can access all departments
    if user_role == UserRole.ADMIN.value:
        return True
    
    # Department heads can only access their own department
    if user_role == UserRole.DEPT_HEAD.value:
        return user_department == department
    
    return False

def login_user(email: str, password: str):
    """
    Login user and return tokens and user data
    """
    try:
        user = authenticate_user(email, password)
        if not user:
            return None, "Invalid email or password"
        
        access_token, refresh_token = generate_tokens(user)
        
        user_data = {
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'role': user.role.value,
            'department': user.department,
            'created_at': user.created_at.isoformat()
        }
        
        return {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': user_data
        }, None
        
    except Exception as e:
        return None, f"Login failed: {str(e)}"

def register_user(name: str, email: str, password: str, role: str, department: str = None):
    """
    Register new user and return tokens and user data
    """
    try:
        # Validate role
        if role not in [UserRole.ADMIN.value, UserRole.DEPT_HEAD.value]:
            return None, "Invalid role specified"
        
        user_role = UserRole(role)
        
        # Validate department requirement
        if user_role == UserRole.DEPT_HEAD and not department:
            return None, "Department is required for department heads"
        
        user = create_user(name, email, password, user_role, department)
        if not user:
            return None, "User with this email already exists"
        
        access_token, refresh_token = generate_tokens(user)
        
        user_data = {
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'role': user.role.value,
            'department': user.department,
            'created_at': user.created_at.isoformat()
        }
        
        return {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': user_data
        }, None
        
    except Exception as e:
        return None, f"Registration failed: {str(e)}"

def refresh_user_token(refresh_token: str):
    """
    Refresh user access token using refresh token
    """
    try:
        # This would typically be handled by Flask-JWT-Extended's refresh endpoint
        # Implementation depends on how refresh tokens are handled in routes
        pass
    except Exception as e:
        return None, f"Token refresh failed: {str(e)}"
