from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Time, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from datetime import datetime
import enum
import os
from dotenv import load_dotenv

load_dotenv()

Base = declarative_base()

class UserRole(enum.Enum):
    ADMIN = "admin"
    DEPT_HEAD = "dept_head"

class RoomType(enum.Enum):
    LECTURE = "lecture"
    LAB = "lab"
    COMPUTER_LAB = "computer_lab"
    CONFERENCE = "conference"

class CourseType(enum.Enum):
    LECTURE = "lecture"
    LAB = "lab"

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    department = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    dept_timetables = relationship("DeptTimetable", back_populates="user")

class Section(Base):
    __tablename__ = 'sections'
    
    id = Column(Integer, primary_key=True)
    code = Column(String(20), nullable=False)
    department = Column(String(100), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User")
    assignments = relationship("Assignment", back_populates="section")

class Teacher(Base):
    __tablename__ = 'teachers'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    department = Column(String(100), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    max_hours_per_day = Column(Integer, default=8)
    availability = Column(Text)  # JSON string of availability matrix
    days_off = Column(Text)  # JSON string of days off
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User")
    assignments = relationship("Assignment", back_populates="teacher")

class Course(Base):
    __tablename__ = 'courses'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    course_type = Column(Enum(CourseType), nullable=False)
    duration_minutes = Column(Integer, nullable=False, default=55)
    sessions_per_week = Column(Integer, nullable=False, default=1)
    room_type = Column(Enum(RoomType), nullable=False)
    department = Column(String(100), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User")
    assignments = relationship("Assignment", back_populates="course")

class Classroom(Base):
    __tablename__ = 'classrooms'
    
    id = Column(Integer, primary_key=True)
    room_id = Column(String(20), nullable=False)
    room_type = Column(Enum(RoomType), nullable=False)
    capacity = Column(Integer, nullable=False)
    department = Column(String(100), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User")
    scheduled_slots = relationship("ScheduledSlot", back_populates="classroom")

class Assignment(Base):
    __tablename__ = 'assignments'
    
    id = Column(Integer, primary_key=True)
    course_id = Column(Integer, ForeignKey('courses.id'), nullable=False)
    section_id = Column(Integer, ForeignKey('sections.id'), nullable=False)
    teacher_id = Column(Integer, ForeignKey('teachers.id'), nullable=False)
    group_id = Column(String(50), nullable=True)  # For grouping multiple sections
    department = Column(String(100), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User")
    course = relationship("Course", back_populates="assignments")
    section = relationship("Section", back_populates="assignments")
    teacher = relationship("Teacher", back_populates="assignments")
    scheduled_slots = relationship("ScheduledSlot", back_populates="assignment")

class Rule(Base):
    __tablename__ = 'rules'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    rule_type = Column(String(50), nullable=False)  # lunch_window, max_lectures_per_day, gap_preference, forbidden_time_pairs
    rule_data = Column(Text, nullable=False)  # JSON string containing rule parameters
    department = Column(String(100), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User")

class DeptTimetable(Base):
    __tablename__ = 'dept_timetables'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    department = Column(String(100), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    status = Column(String(20), default='draft')  # draft, generating, completed, failed
    generation_log = Column(Text)  # Log of generation process
    solver_stats = Column(Text)  # JSON string of solver statistics
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="dept_timetables")
    scheduled_slots = relationship("ScheduledSlot", back_populates="dept_timetable")

class ScheduledSlot(Base):
    __tablename__ = 'scheduled_slots'
    
    id = Column(Integer, primary_key=True)
    dept_timetable_id = Column(Integer, ForeignKey('dept_timetables.id'), nullable=False)
    assignment_id = Column(Integer, ForeignKey('assignments.id'), nullable=False)
    classroom_id = Column(Integer, ForeignKey('classrooms.id'), nullable=False)
    day_of_week = Column(Integer, nullable=False)  # 0=Monday, 1=Tuesday, etc.
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    department = Column(String(100), nullable=False)
    is_global_slot = Column(Boolean, default=False)  # For global scheduling tracking
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    dept_timetable = relationship("DeptTimetable", back_populates="scheduled_slots")
    assignment = relationship("Assignment", back_populates="scheduled_slots")
    classroom = relationship("Classroom", back_populates="scheduled_slots")

# Database connection setup
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:VTjgkaUv@127.0.0.1:5432/university_scheduler')
engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
