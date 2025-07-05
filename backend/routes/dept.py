from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required
from pydantic import ValidationError
from typing import List, Dict, Any
import json
import logging

from models import (
    SessionLocal, Section, Teacher, Course, Classroom, Assignment, Rule, 
    DeptTimetable, ScheduledSlot, UserRole, RoomType, CourseType
)
from schemas import (
    SectionCreate, SectionResponse, TeacherCreate, TeacherResponse,
    CourseCreate, CourseResponse, ClassroomCreate, ClassroomResponse,
    AssignmentCreate, AssignmentResponse, RuleCreate, RuleResponse,
    DeptTimetableCreate, DeptTimetableResponse, ScheduledSlotResponse,
    BulkResponse, TimetableGenerationResponse, ApiResponse,
    Step1SectionsRequest, Step2TeachersRequest, Step3CoursesRequest,
    Step4ClassroomsRequest, Step5AssignmentsRequest, Step6RulesRequest,
    Step7ReviewRequest
)
from middleware import dept_head_required, department_access_required, get_current_user_context
from scheduler import generate_timetable, validate_scheduling_data
from global_scheduler import check_department_conflicts, reserve_department_slots

# Create blueprint
dept_bp = Blueprint('dept', __name__)

# Configure logging
logger = logging.getLogger(__name__)

def get_db():
    """Get database session"""
    return SessionLocal()

def get_current_user_dept():
    """Get current user's department"""
    user = get_current_user_context()
    return user.get('department') if user else None

def get_current_user_id():
    """Get current user's ID"""
    user = get_current_user_context()
    return user.get('id') if user else None

# Section Management Endpoints
@dept_bp.route('/sections', methods=['GET'])
@dept_head_required
def get_sections():
    """Get all sections for the department"""
    try:
        department = get_current_user_dept()
        user_id = get_current_user_id()
        
        db = get_db()
        try:
            sections = db.query(Section).filter(
                Section.department == department,
                Section.user_id == user_id
            ).all()
            
            sections_data = [SectionResponse.from_orm(section) for section in sections]
            
            return jsonify({
                'success': True,
                'message': f'Retrieved {len(sections_data)} sections',
                'data': [section.dict() for section in sections_data]
            }), 200
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Get sections error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to retrieve sections'
        }), 500

@dept_bp.route('/sections/step1', methods=['POST'])
@dept_head_required
def create_sections_step1():
    """Create sections (Step 1 of wizard)"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        # Validate input
        try:
            sections_request = Step1SectionsRequest(**data)
        except ValidationError as e:
            return jsonify({
                'success': False,
                'message': 'Validation error',
                'errors': [error['msg'] for error in e.errors()]
            }), 400
        
        department = get_current_user_dept()
        user_id = get_current_user_id()
        
        db = get_db()
        try:
            created_sections = []
            errors = []
            
            for section_data in sections_request.sections:
                try:
                    # Check if section already exists
                    existing = db.query(Section).filter(
                        Section.code == section_data.code,
                        Section.department == department,
                        Section.user_id == user_id
                    ).first()
                    
                    if existing:
                        errors.append(f"Section {section_data.code} already exists")
                        continue
                    
                    section = Section(
                        code=section_data.code,
                        department=department,
                        user_id=user_id
                    )
                    
                    db.add(section)
                    db.flush()
                    created_sections.append(section)
                    
                except Exception as e:
                    errors.append(f"Failed to create section {section_data.code}: {str(e)}")
            
            db.commit()
            
            return jsonify({
                'success': True,
                'message': f'Created {len(created_sections)} sections',
                'data': {
                    'created_count': len(created_sections),
                    'errors': errors,
                    'sections': [SectionResponse.from_orm(s).dict() for s in created_sections]
                }
            }), 201
            
        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Create sections error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to create sections'
        }), 500

# Teacher Management Endpoints
@dept_bp.route('/teachers', methods=['GET'])
@dept_head_required
def get_teachers():
    """Get all teachers for the department"""
    try:
        department = get_current_user_dept()
        user_id = get_current_user_id()
        
        db = get_db()
        try:
            teachers = db.query(Teacher).filter(
                Teacher.department == department,
                Teacher.user_id == user_id
            ).all()
            
            teachers_data = [TeacherResponse.from_orm(teacher) for teacher in teachers]
            
            return jsonify({
                'success': True,
                'message': f'Retrieved {len(teachers_data)} teachers',
                'data': [teacher.dict() for teacher in teachers_data]
            }), 200
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Get teachers error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to retrieve teachers'
        }), 500

@dept_bp.route('/teachers/step2', methods=['POST'])
@dept_head_required
def create_teachers_step2():
    """Create teachers (Step 2 of wizard)"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        # Validate input
        try:
            teachers_request = Step2TeachersRequest(**data)
        except ValidationError as e:
            return jsonify({
                'success': False,
                'message': 'Validation error',
                'errors': [error['msg'] for error in e.errors()]
            }), 400
        
        department = get_current_user_dept()
        user_id = get_current_user_id()
        
        db = get_db()
        try:
            created_teachers = []
            errors = []
            
            for teacher_data in teachers_request.teachers:
                try:
                    # Check if teacher already exists
                    existing = db.query(Teacher).filter(
                        Teacher.name == teacher_data.name,
                        Teacher.department == department,
                        Teacher.user_id == user_id
                    ).first()
                    
                    if existing:
                        errors.append(f"Teacher {teacher_data.name} already exists")
                        continue
                    
                    teacher = Teacher(
                        name=teacher_data.name,
                        department=department,
                        user_id=user_id,
                        max_hours_per_day=teacher_data.max_hours_per_day,
                        availability=json.dumps(teacher_data.availability) if teacher_data.availability else None,
                        days_off=json.dumps(teacher_data.days_off) if teacher_data.days_off else None
                    )
                    
                    db.add(teacher)
                    db.flush()
                    created_teachers.append(teacher)
                    
                except Exception as e:
                    errors.append(f"Failed to create teacher {teacher_data.name}: {str(e)}")
            
            db.commit()
            
            return jsonify({
                'success': True,
                'message': f'Created {len(created_teachers)} teachers',
                'data': {
                    'created_count': len(created_teachers),
                    'errors': errors,
                    'teachers': [TeacherResponse.from_orm(t).dict() for t in created_teachers]
                }
            }), 201
            
        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Create teachers error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to create teachers'
        }), 500

# Course Management Endpoints
@dept_bp.route('/courses', methods=['GET'])
@dept_head_required
def get_courses():
    """Get all courses for the department"""
    try:
        department = get_current_user_dept()
        user_id = get_current_user_id()
        
        db = get_db()
        try:
            courses = db.query(Course).filter(
                Course.department == department,
                Course.user_id == user_id
            ).all()
            
            courses_data = [CourseResponse.from_orm(course) for course in courses]
            
            return jsonify({
                'success': True,
                'message': f'Retrieved {len(courses_data)} courses',
                'data': [course.dict() for course in courses_data]
            }), 200
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Get courses error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to retrieve courses'
        }), 500

@dept_bp.route('/courses/step3', methods=['POST'])
@dept_head_required
def create_courses_step3():
    """Create courses (Step 3 of wizard)"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        # Validate input
        try:
            courses_request = Step3CoursesRequest(**data)
        except ValidationError as e:
            return jsonify({
                'success': False,
                'message': 'Validation error',
                'errors': [error['msg'] for error in e.errors()]
            }), 400
        
        department = get_current_user_dept()
        user_id = get_current_user_id()
        
        db = get_db()
        try:
            created_courses = []
            errors = []
            
            for course_data in courses_request.courses:
                try:
                    # Check if course already exists
                    existing = db.query(Course).filter(
                        Course.name == course_data.name,
                        Course.department == department,
                        Course.user_id == user_id
                    ).first()
                    
                    if existing:
                        errors.append(f"Course {course_data.name} already exists")
                        continue
                    
                    course = Course(
                        name=course_data.name,
                        course_type=CourseType(course_data.course_type),
                        duration_minutes=course_data.duration_minutes,
                        sessions_per_week=course_data.sessions_per_week,
                        room_type=RoomType(course_data.room_type),
                        department=department,
                        user_id=user_id
                    )
                    
                    db.add(course)
                    db.flush()
                    created_courses.append(course)
                    
                except Exception as e:
                    errors.append(f"Failed to create course {course_data.name}: {str(e)}")
            
            db.commit()
            
            return jsonify({
                'success': True,
                'message': f'Created {len(created_courses)} courses',
                'data': {
                    'created_count': len(created_courses),
                    'errors': errors,
                    'courses': [CourseResponse.from_orm(c).dict() for c in created_courses]
                }
            }), 201
            
        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Create courses error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to create courses'
        }), 500

# Classroom Management Endpoints
@dept_bp.route('/classrooms', methods=['GET'])
@dept_head_required
def get_classrooms():
    """Get all classrooms for the department"""
    try:
        department = get_current_user_dept()
        user_id = get_current_user_id()
        
        db = get_db()
        try:
            classrooms = db.query(Classroom).filter(
                Classroom.department == department,
                Classroom.user_id == user_id
            ).all()
            
            classrooms_data = [ClassroomResponse.from_orm(classroom) for classroom in classrooms]
            
            return jsonify({
                'success': True,
                'message': f'Retrieved {len(classrooms_data)} classrooms',
                'data': [classroom.dict() for classroom in classrooms_data]
            }), 200
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Get classrooms error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to retrieve classrooms'
        }), 500

@dept_bp.route('/classrooms/step4', methods=['POST'])
@dept_head_required
def create_classrooms_step4():
    """Create classrooms (Step 4 of wizard)"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        # Validate input
        try:
            classrooms_request = Step4ClassroomsRequest(**data)
        except ValidationError as e:
            return jsonify({
                'success': False,
                'message': 'Validation error',
                'errors': [error['msg'] for error in e.errors()]
            }), 400
        
        department = get_current_user_dept()
        user_id = get_current_user_id()
        
        db = get_db()
        try:
            created_classrooms = []
            errors = []
            
            for classroom_data in classrooms_request.classrooms:
                try:
                    # Check if classroom already exists
                    existing = db.query(Classroom).filter(
                        Classroom.room_id == classroom_data.room_id,
                        Classroom.department == department,
                        Classroom.user_id == user_id
                    ).first()
                    
                    if existing:
                        errors.append(f"Classroom {classroom_data.room_id} already exists")
                        continue
                    
                    classroom = Classroom(
                        room_id=classroom_data.room_id,
                        room_type=RoomType(classroom_data.room_type),
                        capacity=classroom_data.capacity,
                        department=department,
                        user_id=user_id
                    )
                    
                    db.add(classroom)
                    db.flush()
                    created_classrooms.append(classroom)
                    
                except Exception as e:
                    errors.append(f"Failed to create classroom {classroom_data.room_id}: {str(e)}")
            
            db.commit()
            
            return jsonify({
                'success': True,
                'message': f'Created {len(created_classrooms)} classrooms',
                'data': {
                    'created_count': len(created_classrooms),
                    'errors': errors,
                    'classrooms': [ClassroomResponse.from_orm(c).dict() for c in created_classrooms]
                }
            }), 201
            
        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Create classrooms error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to create classrooms'
        }), 500

# Assignment Management Endpoints
@dept_bp.route('/assignments', methods=['GET'])
@dept_head_required
def get_assignments():
    """Get all assignments for the department"""
    try:
        department = get_current_user_dept()
        user_id = get_current_user_id()
        
        db = get_db()
        try:
            assignments = db.query(Assignment).filter(
                Assignment.department == department,
                Assignment.user_id == user_id
            ).all()
            
            assignments_data = [AssignmentResponse.from_orm(assignment) for assignment in assignments]
            
            return jsonify({
                'success': True,
                'message': f'Retrieved {len(assignments_data)} assignments',
                'data': [assignment.dict() for assignment in assignments_data]
            }), 200
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Get assignments error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to retrieve assignments'
        }), 500

@dept_bp.route('/assignments/step5', methods=['POST'])
@dept_head_required
def create_assignments_step5():
    """Create assignments (Step 5 of wizard)"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        # Validate input
        try:
            assignments_request = Step5AssignmentsRequest(**data)
        except ValidationError as e:
            return jsonify({
                'success': False,
                'message': 'Validation error',
                'errors': [error['msg'] for error in e.errors()]
            }), 400
        
        department = get_current_user_dept()
        user_id = get_current_user_id()
        
        db = get_db()
        try:
            created_assignments = []
            errors = []
            
            for assignment_data in assignments_request.assignments:
                try:
                    # Validate course, section, and teacher exist
                    course = db.query(Course).filter(
                        Course.id == assignment_data.course_id,
                        Course.department == department,
                        Course.user_id == user_id
                    ).first()
                    
                    section = db.query(Section).filter(
                        Section.id == assignment_data.section_id,
                        Section.department == department,
                        Section.user_id == user_id
                    ).first()
                    
                    teacher = db.query(Teacher).filter(
                        Teacher.id == assignment_data.teacher_id,
                        Teacher.department == department,
                        Teacher.user_id == user_id
                    ).first()
                    
                    if not course:
                        errors.append(f"Course with ID {assignment_data.course_id} not found")
                        continue
                    
                    if not section:
                        errors.append(f"Section with ID {assignment_data.section_id} not found")
                        continue
                    
                    if not teacher:
                        errors.append(f"Teacher with ID {assignment_data.teacher_id} not found")
                        continue
                    
                    # Check if assignment already exists
                    existing = db.query(Assignment).filter(
                        Assignment.course_id == assignment_data.course_id,
                        Assignment.section_id == assignment_data.section_id,
                        Assignment.teacher_id == assignment_data.teacher_id,
                        Assignment.department == department,
                        Assignment.user_id == user_id
                    ).first()
                    
                    if existing:
                        errors.append(f"Assignment for course {course.name}, section {section.code}, teacher {teacher.name} already exists")
                        continue
                    
                    assignment = Assignment(
                        course_id=assignment_data.course_id,
                        section_id=assignment_data.section_id,
                        teacher_id=assignment_data.teacher_id,
                        group_id=assignment_data.group_id,
                        department=department,
                        user_id=user_id
                    )
                    
                    db.add(assignment)
                    db.flush()
                    created_assignments.append(assignment)
                    
                except Exception as e:
                    errors.append(f"Failed to create assignment: {str(e)}")
            
            db.commit()
            
            return jsonify({
                'success': True,
                'message': f'Created {len(created_assignments)} assignments',
                'data': {
                    'created_count': len(created_assignments),
                    'errors': errors,
                    'assignments': [AssignmentResponse.from_orm(a).dict() for a in created_assignments]
                }
            }), 201
            
        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Create assignments error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to create assignments'
        }), 500

# Rule Management Endpoints
@dept_bp.route('/rules', methods=['GET'])
@dept_head_required
def get_rules():
    """Get all rules for the department"""
    try:
        department = get_current_user_dept()
        user_id = get_current_user_id()
        
        db = get_db()
        try:
            rules = db.query(Rule).filter(
                Rule.department == department,
                Rule.user_id == user_id
            ).all()
            
            rules_data = [RuleResponse.from_orm(rule) for rule in rules]
            
            return jsonify({
                'success': True,
                'message': f'Retrieved {len(rules_data)} rules',
                'data': [rule.dict() for rule in rules_data]
            }), 200
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Get rules error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to retrieve rules'
        }), 500

@dept_bp.route('/rules/step6', methods=['POST'])
@dept_head_required
def create_rules_step6():
    """Create rules (Step 6 of wizard)"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        # Validate input
        try:
            rules_request = Step6RulesRequest(**data)
        except ValidationError as e:
            return jsonify({
                'success': False,
                'message': 'Validation error',
                'errors': [error['msg'] for error in e.errors()]
            }), 400
        
        department = get_current_user_dept()
        user_id = get_current_user_id()
        
        db = get_db()
        try:
            created_rules = []
            errors = []
            
            for rule_data in rules_request.rules:
                try:
                    # Check if rule already exists
                    existing = db.query(Rule).filter(
                        Rule.name == rule_data.name,
                        Rule.department == department,
                        Rule.user_id == user_id
                    ).first()
                    
                    if existing:
                        errors.append(f"Rule {rule_data.name} already exists")
                        continue
                    
                    rule = Rule(
                        name=rule_data.name,
                        rule_type=rule_data.rule_type,
                        rule_data=json.dumps(rule_data.rule_data),
                        department=department,
                        user_id=user_id
                    )
                    
                    db.add(rule)
                    db.flush()
                    created_rules.append(rule)
                    
                except Exception as e:
                    errors.append(f"Failed to create rule {rule_data.name}: {str(e)}")
            
            db.commit()
            
            return jsonify({
                'success': True,
                'message': f'Created {len(created_rules)} rules',
                'data': {
                    'created_count': len(created_rules),
                    'errors': errors,
                    'rules': [RuleResponse.from_orm(r).dict() for r in created_rules]
                }
            }), 201
            
        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Create rules error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to create rules'
        }), 500

# Timetable Management Endpoints
@dept_bp.route('/timetables', methods=['GET'])
@dept_head_required
def get_timetables():
    """Get all department timetables"""
    try:
        department = get_current_user_dept()
        user_id = get_current_user_id()
        
        db = get_db()
        try:
            timetables = db.query(DeptTimetable).filter(
                DeptTimetable.department == department,
                DeptTimetable.user_id == user_id
            ).order_by(DeptTimetable.updated_at.desc()).all()
            
            timetables_data = [DeptTimetableResponse.from_orm(timetable) for timetable in timetables]
            
            return jsonify({
                'success': True,
                'message': f'Retrieved {len(timetables_data)} timetables',
                'data': [timetable.dict() for timetable in timetables_data]
            }), 200
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Get timetables error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to retrieve timetables'
        }), 500

@dept_bp.route('/timetables/step7', methods=['POST'])
@dept_head_required
def create_timetable_step7():
    """Create and generate timetable (Step 7 of wizard)"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        # Validate input
        try:
            review_request = Step7ReviewRequest(**data)
        except ValidationError as e:
            return jsonify({
                'success': False,
                'message': 'Validation error',
                'errors': [error['msg'] for error in e.errors()]
            }), 400
        
        department = get_current_user_dept()
        user_id = get_current_user_id()
        
        # Validate that all necessary data exists
        is_valid, validation_errors = validate_scheduling_data(department, user_id)
        if not is_valid:
            return jsonify({
                'success': False,
                'message': 'Data validation failed',
                'errors': validation_errors
            }), 400
        
        db = get_db()
        try:
            # Create timetable record
            timetable = DeptTimetable(
                name=review_request.timetable_name,
                department=department,
                user_id=user_id,
                status='draft'
            )
            
            db.add(timetable)
            db.commit()
            db.refresh(timetable)
            
            # Start timetable generation in background
            # For now, we'll call it synchronously - in production, use Celery or similar
            success, message, solver_stats = generate_timetable(
                department=department,
                user_id=user_id,
                timetable_id=timetable.id,
                time_limit=300
            )
            
            response_data = {
                'timetable_id': timetable.id,
                'success': success,
                'message': message,
                'solver_stats': solver_stats
            }
            
            if success:
                # Check for global conflicts
                has_conflicts, conflicts = check_department_conflicts(department, timetable.id)
                if has_conflicts:
                    response_data['conflicts'] = conflicts
                    response_data['message'] += f" Warning: {len(conflicts)} conflicts detected with other departments."
            
            return jsonify({
                'success': success,
                'message': message,
                'data': response_data
            }), 200 if success else 400
            
        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Create timetable error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to create timetable'
        }), 500

@dept_bp.route('/timetables/<int:timetable_id>/results', methods=['GET'])
@dept_head_required
def get_timetable_results(timetable_id):
    """Get timetable generation results"""
    try:
        department = get_current_user_dept()
        user_id = get_current_user_id()
        
        db = get_db()
        try:
            # Verify timetable belongs to user
            timetable = db.query(DeptTimetable).filter(
                DeptTimetable.id == timetable_id,
                DeptTimetable.department == department,
                DeptTimetable.user_id == user_id
            ).first()
            
            if not timetable:
                return jsonify({
                    'success': False,
                    'message': 'Timetable not found'
                }), 404
            
            # Get scheduled slots
            scheduled_slots = db.query(ScheduledSlot).filter(
                ScheduledSlot.dept_timetable_id == timetable_id
            ).all()
            
            slots_data = []
            for slot in scheduled_slots:
                # Get related data
                assignment = db.query(Assignment).filter(Assignment.id == slot.assignment_id).first()
                classroom = db.query(Classroom).filter(Classroom.id == slot.classroom_id).first()
                
                slot_info = ScheduledSlotResponse.from_orm(slot).dict()
                
                if assignment:
                    slot_info.update({
                        'course_name': assignment.course.name if assignment.course else 'Unknown',
                        'section_code': assignment.section.code if assignment.section else 'Unknown',
                        'teacher_name': assignment.teacher.name if assignment.teacher else 'Unknown'
                    })
                
                if classroom:
                    slot_info['room_id'] = classroom.room_id
                
                slots_data.append(slot_info)
            
            return jsonify({
                'success': True,
                'message': f'Retrieved timetable results with {len(slots_data)} scheduled slots',
                'data': {
                    'timetable': DeptTimetableResponse.from_orm(timetable).dict(),
                    'scheduled_slots': slots_data
                }
            }), 200
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Get timetable results error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to retrieve timetable results'
        }), 500