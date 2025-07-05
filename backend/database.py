from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, User, Section, Teacher, Course, Classroom, Assignment, Rule, DeptTimetable, ScheduledSlot
import os
from dotenv import load_dotenv

load_dotenv()

# Database configuration
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:VTjgkaUv@127.0.0.1:5432/university_scheduler')

# Create engine with connection pooling
engine = create_engine(
    DATABASE_URL,
    echo=False,  # Set to True for SQL logging in development
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    pool_recycle=3600
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """
    Database session dependency for API routes
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_db_session():
    """
    Get a database session for direct use
    """
    return SessionLocal()

def init_db():
    """
    Initialize database tables
    """
    try:
        # Create all tables
        Base.metadata.create_all(bind=engine)
        print("Database tables created successfully")
        
        # Create default admin user if not exists
        create_default_admin()
        
    except Exception as e:
        print(f"Error initializing database: {e}")
        raise

def create_default_admin():
    """
    Create default admin user if not exists
    """
    from models import User, UserRole
    import bcrypt
    
    db = SessionLocal()
    try:
        # Check if admin user already exists
        admin_user = db.query(User).filter(User.email == 'admin@university.edu').first()
        
        if not admin_user:
            # Create default admin user
            password = 'admin123'
            password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            admin = User(
                name='System Administrator',
                email='admin@university.edu',
                password_hash=password_hash,
                role=UserRole.ADMIN,
                department='Administration'
            )
            
            db.add(admin)
            db.commit()
            print("Default admin user created: admin@university.edu / admin123")
        else:
            print("Admin user already exists")
            
    except Exception as e:
        print(f"Error creating default admin: {e}")
        db.rollback()
    finally:
        db.close()

def drop_all_tables():
    """
    Drop all database tables (use with caution)
    """
    try:
        Base.metadata.drop_all(bind=engine)
        print("All database tables dropped")
    except Exception as e:
        print(f"Error dropping tables: {e}")
        raise

def reset_db():
    """
    Reset database by dropping and recreating all tables
    """
    try:
        drop_all_tables()
        init_db()
        print("Database reset completed")
    except Exception as e:
        print(f"Error resetting database: {e}")
        raise

def check_connection():
    """
    Test database connection
    """
    try:
        with engine.connect() as connection:
            result = connection.execute("SELECT 1")
            print("Database connection successful")
            return True
    except Exception as e:
        print(f"Database connection failed: {e}")
        return False
