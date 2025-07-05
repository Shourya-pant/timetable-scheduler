from pydantic import BaseModel, EmailStr, validator, Field
from typing import List, Optional, Dict, Any, Union
from datetime import datetime, time
from enum import Enum

# Enums for validation
class UserRoleEnum(str, Enum):
    ADMIN = "admin"
    DEPT_HEAD = "dept_head"

class RoomTypeEnum(str, Enum):
    LECTURE = "lecture"
    LAB = "lab"
    COMPUTER_LAB = "computer_lab"
    CONFERENCE = "conference"

class CourseTypeEnum(str, Enum):
    LECTURE = "lecture"
    LAB = "lab"

class TimetableStatusEnum(str, Enum):
    DRAFT = "draft"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"

# Authentication Schemas
class UserRegistration(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=50)
    role: UserRoleEnum
    department: Optional[str] = Field(None, max_length=100)

    @validator('department')
    def validate_department(cls, v, values):
        if values.get('role') == UserRoleEnum.DEPT_HEAD and not v:
            raise ValueError('Department is required for department heads')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    department: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: UserResponse

# Section Schemas
class SectionCreate(BaseModel):
    code: str = Field(..., min_length=1, max_length=20)

class SectionResponse(BaseModel):
    id: int
    code: str
    department: str
    created_at: datetime

    class Config:
        from_attributes = True

# Teacher Schemas
class TeacherCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    max_hours_per_day: int = Field(default=8, ge=1, le=12)
    availability: Optional[List[List[bool]]] = None  # 5 days x time slots matrix
    days_off: Optional[List[int]] = None  # List of day indices (0-4)

class TeacherResponse(BaseModel):
    id: int
    name: str
    department: str
    max_hours_per_day: int
    availability: Optional[str]
    days_off: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

# Course Schemas
class CourseCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    course_type: CourseTypeEnum
    duration_minutes: int = Field(default=55, ge=30, le=180)
    sessions_per_week: int = Field(default=1, ge=1, le=7)
    room_type: RoomTypeEnum

class CourseResponse(BaseModel):
    id: int
    name: str
    course_type: str
    duration_minutes: int
    sessions_per_week: int
    room_type: str
    department: str
    created_at: datetime

    class Config:
        from_attributes = True

# Classroom Schemas
class ClassroomCreate(BaseModel):
    room_id: str = Field(..., min_length=1, max_length=20)
    room_type: RoomTypeEnum
    capacity: int = Field(..., ge=1, le=500)

class ClassroomResponse(BaseModel):
    id: int
    room_id: str
    room_type: str
    capacity: int
    department: str
    created_at: datetime

    class Config:
        from_attributes = True

# Assignment Schemas
class AssignmentCreate(BaseModel):
    course_id: int
    section_id: int
    teacher_id: int
    group_id: Optional[str] = None

class AssignmentResponse(BaseModel):
    id: int
    course_id: int
    section_id: int
    teacher_id: int
    group_id: Optional[str]
    department: str
    created_at: datetime

    class Config:
        from_attributes = True

# Rule Schemas
class RuleCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    rule_type: str = Field(..., pattern="^(lunch_window|max_lectures_per_day|gap_preference|forbidden_time_pairs)$")
    rule_data: Dict[str, Any]

class RuleResponse(BaseModel):
    id: int
    name: str
    rule_type: str
    rule_data: str
    department: str
    created_at: datetime

    class Config:
        from_attributes = True

# Timetable Creation Steps
class Step1SectionsRequest(BaseModel):
    sections: List[SectionCreate]

class Step2TeachersRequest(BaseModel):
    teachers: List[TeacherCreate]

class Step3CoursesRequest(BaseModel):
    courses: List[CourseCreate]

class Step4ClassroomsRequest(BaseModel):
    classrooms: List[ClassroomCreate]

class Step5AssignmentsRequest(BaseModel):
    assignments: List[AssignmentCreate]

class Step6RulesRequest(BaseModel):
    rules: List[RuleCreate]

class Step7ReviewRequest(BaseModel):
    timetable_name: str = Field(..., min_length=2, max_length=100)

# Timetable Schemas
class DeptTimetableCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)

class DeptTimetableResponse(BaseModel):
    id: int
    name: str
    department: str
    status: str
    generation_log: Optional[str]
    solver_stats: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Scheduled Slot Schemas
class ScheduledSlotResponse(BaseModel):
    id: int
    dept_timetable_id: int
    assignment_id: int
    classroom_id: int
    day_of_week: int
    start_time: str
    end_time: str
    department: str
    is_global_slot: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Bulk Response Schemas
class BulkResponse(BaseModel):
    success: bool
    message: str
    created_count: int
    errors: Optional[List[str]] = None

# Timetable Generation Response
class TimetableGenerationResponse(BaseModel):
    success: bool
    message: str
    timetable_id: Optional[int] = None
    generation_log: Optional[str] = None
    solver_stats: Optional[Dict[str, Any]] = None

# API Response Wrappers
class ApiResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Any] = None

class PaginatedResponse(BaseModel):
    success: bool
    message: str
    data: List[Any]
    total: int
    page: int
    per_page: int
    total_pages: int

# Schedule Export Schemas
class ExportRequest(BaseModel):
    timetable_id: int
    export_type: str = Field(..., pattern="^(sections|teachers|classrooms|full)$")
    format: str = Field(default="pdf", pattern="^(pdf|json)$")

# Filter and Search Schemas
class TimetableFilter(BaseModel):
    department: Optional[str] = None
    status: Optional[TimetableStatusEnum] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None

class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=100)
    search_type: str = Field(..., pattern="^(sections|teachers|courses|classrooms)$")

# Validation Response
class ValidationResponse(BaseModel):
    valid: bool
    errors: List[str] = []
    warnings: List[str] = []

# Statistics Schemas
class TimetableStats(BaseModel):
    total_slots: int
    scheduled_slots: int
    unscheduled_assignments: int
    teacher_conflicts: int
    room_conflicts: int
    constraint_violations: int

class DashboardStats(BaseModel):
    total_timetables: int
    active_timetables: int
    total_teachers: int
    total_sections: int
    total_courses: int
    total_classrooms: int