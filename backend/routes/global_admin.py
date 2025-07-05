from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required
from pydantic import ValidationError
from typing import List, Dict, Any
import json
import logging

from models import (
    SessionLocal, DeptTimetable, ScheduledSlot, User, Teacher, Course, 
    Classroom, Assignment, UserRole
)
from schemas import ApiResponse, TimetableFilter, SearchRequest
from middleware import admin_required, get_current_user_context
from global_scheduler import (
    initialize_global_scheduler, check_department_conflicts,
    reserve_department_slots, release_department_slots,
    synchronize_all_departments, get_shared_resources,
    get_global_summary, validate_global_state
)

# Create blueprint
global_admin_bp = Blueprint('global_admin', __name__)

# Configure logging
logger = logging.getLogger(__name__)

def get_db():
    """Get database session"""
    return SessionLocal()

def get_current_user_info():
    """Get current user information"""
    return get_current_user_context()

# Global Dashboard and Statistics
@global_admin_bp.route('/dashboard', methods=['GET'])
@admin_required
def get_global_dashboard():
    """Get global dashboard statistics for admin"""
    try:
        db = get_db()
        try:
            # Get overall statistics
            total_departments = db.query(User.department).filter(
                User.role == UserRole.DEPT_HEAD,
                User.department.isnot(None)
            ).distinct().count()
            
            total_timetables = db.query(DeptTimetable).count()
            active_timetables = db.query(DeptTimetable).filter(
                DeptTimetable.status == 'completed'
            ).count()
            
            total_teachers = db.query(Teacher).count()
            total_courses = db.query(Course).count()
            total_classrooms = db.query(Classroom).count()
            total_scheduled_slots = db.query(ScheduledSlot).count()
            global_slots = db.query(ScheduledSlot).filter(
                ScheduledSlot.is_global_slot == True
            ).count()
            
            # Get department-wise statistics
            dept_stats = {}
            departments = db.query(User.department).filter(
                User.role == UserRole.DEPT_HEAD,
                User.department.isnot(None)
            ).distinct().all()
            
            for dept_tuple in departments:
                dept_name = dept_tuple[0]
                dept_timetables = db.query(DeptTimetable).filter(
                    DeptTimetable.department == dept_name
                ).count()
                dept_teachers = db.query(Teacher).filter(
                    Teacher.department == dept_name
                ).count()
                dept_courses = db.query(Course).filter(
                    Course.department == dept_name
                ).count()
                dept_classrooms = db.query(Classroom).filter(
                    Classroom.department == dept_name
                ).count()
                
                dept_stats[dept_name] = {
                    'timetables': dept_timetables,
                    'teachers': dept_teachers,
                    'courses': dept_courses,
                    'classrooms': dept_classrooms
                }
            
            # Get global scheduler summary
            global_summary = get_global_summary()
            
            dashboard_data = {
                'overview': {
                    'total_departments': total_departments,
                    'total_timetables': total_timetables,
                    'active_timetables': active_timetables,
                    'total_teachers': total_teachers,
                    'total_courses': total_courses,
                    'total_classrooms': total_classrooms,
                    'total_scheduled_slots': total_scheduled_slots,
                    'global_slots': global_slots
                },
                'department_statistics': dept_stats,
                'global_scheduler': global_summary
            }
            
            return jsonify({
                'success': True,
                'message': 'Global dashboard data retrieved successfully',
                'data': dashboard_data
            }), 200
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Global dashboard error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to retrieve global dashboard data'
        }), 500

# Department Management
@global_admin_bp.route('/departments', methods=['GET'])
@admin_required
def get_all_departments():
    """Get all departments with their timetables"""
    try:
        db = get_db()
        try:
            # Get all departments with users
            dept_users = db.query(User).filter(
                User.role == UserRole.DEPT_HEAD,
                User.department.isnot(None)
            ).all()
            
            departments_data = []
            for user in dept_users:
                # Get department timetables
                timetables = db.query(DeptTimetable).filter(
                    DeptTimetable.department == user.department,
                    DeptTimetable.user_id == user.id
                ).order_by(DeptTimetable.updated_at.desc()).all()
                
                dept_info = {
                    'department': user.department,
                    'dept_head': {
                        'id': user.id,
                        'name': user.name,
                        'email': user.email
                    },
                    'timetables': [{
                        'id': tt.id,
                        'name': tt.name,
                        'status': tt.status,
                        'created_at': tt.created_at.isoformat(),
                        'updated_at': tt.updated_at.isoformat()
                    } for tt in timetables]
                }
                departments_data.append(dept_info)
            
            return jsonify({
                'success': True,
                'message': f'Retrieved {len(departments_data)} departments',
                'data': departments_data
            }), 200
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Get departments error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to retrieve departments'
        }), 500

# Global Scheduling Initialization
@global_admin_bp.route('/scheduler/initialize', methods=['POST'])
@admin_required
def initialize_scheduler():
    """Initialize the global scheduler"""
    try:
        initialize_global_scheduler()
        
        return jsonify({
            'success': True,
            'message': 'Global scheduler initialized successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Scheduler initialization error: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to initialize scheduler: {str(e)}'
        }), 500

# Conflict Detection and Resolution
@global_admin_bp.route('/conflicts/detect', methods=['POST'])
@admin_required
def detect_conflicts():
    """Detect conflicts across all departments"""
    try:
        data = request.get_json() or {}
        departments = data.get('departments', [])
        
        if not departments:
            # Get all departments if none specified
            db = get_db()
            try:
                dept_users = db.query(User.department).filter(
                    User.role == UserRole.DEPT_HEAD,
                    User.department.isnot(None)
                ).distinct().all()
                departments = [dept[0] for dept in dept_users]
            finally:
                db.close()
        
        all_conflicts = []
        for department in departments:
            db = get_db()
            try:
                # Get latest timetable for department
                latest_timetable = db.query(DeptTimetable).filter(
                    DeptTimetable.department == department,
                    DeptTimetable.status == 'completed'
                ).order_by(DeptTimetable.updated_at.desc()).first()
                
                if latest_timetable:
                    has_conflicts, conflicts = check_department_conflicts(
                        department, latest_timetable.id
                    )
                    if has_conflicts:
                        all_conflicts.extend(conflicts)
            finally:
                db.close()
        
        return jsonify({
            'success': True,
            'message': f'Detected {len(all_conflicts)} conflicts',
            'data': {
                'conflicts': all_conflicts,
                'departments_checked': departments
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Conflict detection error: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to detect conflicts: {str(e)}'
        }), 500

# Department Synchronization
@global_admin_bp.route('/departments/synchronize', methods=['POST'])
@admin_required
def synchronize_departments():
    """Synchronize timetables across departments"""
    try:
        data = request.get_json()
        if not data or 'departments' not in data:
            return jsonify({
                'success': False,
                'message': 'Departments list is required'
            }), 400
        
        departments = data['departments']
        if not isinstance(departments, list) or len(departments) < 2:
            return jsonify({
                'success': False,
                'message': 'At least 2 departments are required for synchronization'
            }), 400
        
        # Perform synchronization
        sync_result = synchronize_all_departments(departments)
        
        status_code = 200 if sync_result['success'] else 400
        
        return jsonify({
            'success': sync_result['success'],
            'message': 'Synchronization completed' if sync_result['success'] else 'Synchronization failed',
            'data': sync_result
        }), status_code
        
    except Exception as e:
        logger.error(f"Department synchronization error: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to synchronize departments: {str(e)}'
        }), 500

# Global Slot Management
@global_admin_bp.route('/slots/global', methods=['GET'])
@admin_required
def get_global_slots():
    """Get all global slots"""
    try:
        db = get_db()
        try:
            global_slots = db.query(ScheduledSlot).filter(
                ScheduledSlot.is_global_slot == True
            ).all()
            
            slots_data = []
            for slot in global_slots:
                # Get related information
                assignment = db.query(Assignment).filter(Assignment.id == slot.assignment_id).first()
                classroom = db.query(Classroom).filter(Classroom.id == slot.classroom_id).first()
                
                slot_info = {
                    'id': slot.id,
                    'department': slot.department,
                    'day_of_week': slot.day_of_week,
                    'start_time': slot.start_time.strftime('%H:%M'),
                    'end_time': slot.end_time.strftime('%H:%M'),
                    'classroom_id': slot.classroom_id,
                    'room_id': classroom.room_id if classroom else 'Unknown',
                    'course_name': assignment.course.name if assignment and assignment.course else 'Unknown',
                    'section_code': assignment.section.code if assignment and assignment.section else 'Unknown',
                    'teacher_name': assignment.teacher.name if assignment and assignment.teacher else 'Unknown',
                    'created_at': slot.created_at.isoformat()
                }
                slots_data.append(slot_info)
            
            return jsonify({
                'success': True,
                'message': f'Retrieved {len(slots_data)} global slots',
                'data': slots_data
            }), 200
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Get global slots error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to retrieve global slots'
        }), 500

@global_admin_bp.route('/slots/reserve', methods=['POST'])
@admin_required
def reserve_slots():
    """Reserve slots globally for a department"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        department = data.get('department')
        timetable_id = data.get('timetable_id')
        slot_ids = data.get('slot_ids', [])
        
        if not department or not timetable_id or not slot_ids:
            return jsonify({
                'success': False,
                'message': 'Department, timetable_id, and slot_ids are required'
            }), 400
        
        success = reserve_department_slots(department, timetable_id, slot_ids)
        
        if success:
            return jsonify({
                'success': True,
                'message': f'Reserved {len(slot_ids)} slots for {department}'
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': 'Failed to reserve slots'
            }), 400
            
    except Exception as e:
        logger.error(f"Reserve slots error: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to reserve slots: {str(e)}'
        }), 500

@global_admin_bp.route('/slots/release', methods=['POST'])
@admin_required
def release_slots():
    """Release global slots for a department"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        department = data.get('department')
        timetable_id = data.get('timetable_id')
        
        if not department or not timetable_id:
            return jsonify({
                'success': False,
                'message': 'Department and timetable_id are required'
            }), 400
        
        success = release_department_slots(department, timetable_id)
        
        if success:
            return jsonify({
                'success': True,
                'message': f'Released global slots for {department}'
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': 'Failed to release slots'
            }), 400
            
    except Exception as e:
        logger.error(f"Release slots error: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to release slots: {str(e)}'
        }), 500

# Shared Resources Management
@global_admin_bp.route('/resources/shared', methods=['GET'])
@admin_required
def get_available_shared_resources():
    """Get available shared resources"""
    try:
        # Get query parameters
        day = request.args.get('day', type=int)
        start_slot = request.args.get('start_slot', type=int)
        end_slot = request.args.get('end_slot', type=int)
        room_type = request.args.get('room_type')
        
        if day is not None and start_slot is not None and end_slot is not None:
            resources = get_shared_resources(day, start_slot, end_slot, room_type)
        else:
            # Return all shared resources if no time specified
            db = get_db()
            try:
                shared_classrooms = db.query(Classroom).filter(
                    Classroom.department == 'Shared'
                ).all()
                
                resources = [{
                    'classroom_id': c.id,
                    'room_id': c.room_id,
                    'room_type': c.room_type.value,
                    'capacity': c.capacity
                } for c in shared_classrooms]
            finally:
                db.close()
        
        return jsonify({
            'success': True,
            'message': f'Retrieved {len(resources)} shared resources',
            'data': resources
        }), 200
        
    except Exception as e:
        logger.error(f"Get shared resources error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to retrieve shared resources'
        }), 500

# Timetable Analysis and Reports
@global_admin_bp.route('/reports/utilization', methods=['GET'])
@admin_required
def get_utilization_report():
    """Get resource utilization report"""
    try:
        db = get_db()
        try:
            # Calculate classroom utilization
            total_slots = 5 * 10  # 5 days * 10 slots per day
            classrooms = db.query(Classroom).all()
            
            utilization_data = []
            for classroom in classrooms:
                occupied_slots = db.query(ScheduledSlot).filter(
                    ScheduledSlot.classroom_id == classroom.id
                ).count()
                
                utilization_rate = (occupied_slots / total_slots) * 100 if total_slots > 0 else 0
                
                utilization_data.append({
                    'classroom_id': classroom.id,
                    'room_id': classroom.room_id,
                    'department': classroom.department,
                    'room_type': classroom.room_type.value,
                    'capacity': classroom.capacity,
                    'occupied_slots': occupied_slots,
                    'total_slots': total_slots,
                    'utilization_rate': round(utilization_rate, 2)
                })
            
            # Calculate teacher utilization
            teachers = db.query(Teacher).all()
            teacher_utilization = []
            
            for teacher in teachers:
                teacher_assignments = db.query(Assignment).filter(
                    Assignment.teacher_id == teacher.id
                ).count()
                
                teacher_slots = db.query(ScheduledSlot).join(Assignment).filter(
                    Assignment.teacher_id == teacher.id
                ).count()
                
                teacher_utilization.append({
                    'teacher_id': teacher.id,
                    'teacher_name': teacher.name,
                    'department': teacher.department,
                    'assignments': teacher_assignments,
                    'scheduled_slots': teacher_slots,
                    'max_hours_per_day': teacher.max_hours_per_day
                })
            
            report_data = {
                'classroom_utilization': utilization_data,
                'teacher_utilization': teacher_utilization,
                'summary': {
                    'total_classrooms': len(classrooms),
                    'total_teachers': len(teachers),
                    'average_classroom_utilization': round(
                        sum(item['utilization_rate'] for item in utilization_data) / len(utilization_data) 
                        if utilization_data else 0, 2
                    )
                }
            }
            
            return jsonify({
                'success': True,
                'message': 'Utilization report generated successfully',
                'data': report_data
            }), 200
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Utilization report error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to generate utilization report'
        }), 500

@global_admin_bp.route('/reports/conflicts', methods=['GET'])
@admin_required
def get_conflicts_report():
    """Get detailed conflicts report"""
    try:
        db = get_db()
        try:
            # Get all departments
            departments = db.query(User.department).filter(
                User.role == UserRole.DEPT_HEAD,
                User.department.isnot(None)
            ).distinct().all()
            
            conflicts_by_department = {}
            total_conflicts = 0
            
            for dept_tuple in departments:
                department = dept_tuple[0]
                
                # Get latest timetable
                latest_timetable = db.query(DeptTimetable).filter(
                    DeptTimetable.department == department,
                    DeptTimetable.status == 'completed'
                ).order_by(DeptTimetable.updated_at.desc()).first()
                
                if latest_timetable:
                    has_conflicts, conflicts = check_department_conflicts(
                        department, latest_timetable.id
                    )
                    
                    conflicts_by_department[department] = {
                        'timetable_id': latest_timetable.id,
                        'timetable_name': latest_timetable.name,
                        'has_conflicts': has_conflicts,
                        'conflicts_count': len(conflicts),
                        'conflicts': conflicts
                    }
                    
                    total_conflicts += len(conflicts)
                else:
                    conflicts_by_department[department] = {
                        'timetable_id': None,
                        'timetable_name': None,
                        'has_conflicts': False,
                        'conflicts_count': 0,
                        'conflicts': []
                    }
            
            report_data = {
                'total_conflicts': total_conflicts,
                'departments_with_conflicts': sum(
                    1 for dept in conflicts_by_department.values() 
                    if dept['has_conflicts']
                ),
                'conflicts_by_department': conflicts_by_department
            }
            
            return jsonify({
                'success': True,
                'message': 'Conflicts report generated successfully',
                'data': report_data
            }), 200
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Conflicts report error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to generate conflicts report'
        }), 500

# System Validation
@global_admin_bp.route('/validate', methods=['GET'])
@admin_required
def validate_system():
    """Validate global scheduling system consistency"""
    try:
        is_valid, errors = validate_global_state()
        
        return jsonify({
            'success': is_valid,
            'message': 'System validation completed',
            'data': {
                'is_valid': is_valid,
                'errors': errors,
                'validation_timestamp': datetime.utcnow().isoformat()
            }
        }), 200 if is_valid else 400
        
    except Exception as e:
        logger.error(f"System validation error: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'System validation failed: {str(e)}'
        }), 500

# Bulk Operations
@global_admin_bp.route('/timetables/bulk-regenerate', methods=['POST'])
@admin_required
def bulk_regenerate_timetables():
    """Regenerate timetables for multiple departments"""
    try:
        data = request.get_json()
        if not data or 'departments' not in data:
            return jsonify({
                'success': False,
                'message': 'Departments list is required'
            }), 400
        
        departments = data['departments']
        force_regenerate = data.get('force', False)
        
        results = []
        for department in departments:
            try:
                db = get_db()
                try:
                    # Get department user
                    dept_user = db.query(User).filter(
                        User.department == department,
                        User.role == UserRole.DEPT_HEAD
                    ).first()
                    
                    if not dept_user:
                        results.append({
                            'department': department,
                            'success': False,
                            'message': 'Department head not found'
                        })
                        continue
                    
                    # Check if regeneration is needed
                    if not force_regenerate:
                        latest_timetable = db.query(DeptTimetable).filter(
                            DeptTimetable.department == department,
                            DeptTimetable.status == 'completed'
                        ).order_by(DeptTimetable.updated_at.desc()).first()
                        
                        if latest_timetable:
                            has_conflicts, _ = check_department_conflicts(department, latest_timetable.id)
                            if not has_conflicts:
                                results.append({
                                    'department': department,
                                    'success': True,
                                    'message': 'No regeneration needed - no conflicts found'
                                })
                                continue
                        
                finally:
                    db.close()
                
                # Note: In a real implementation, this would trigger async regeneration
                results.append({
                    'department': department,
                    'success': True,
                    'message': 'Regeneration queued (would be async in production)'
                })
                
            except Exception as e:
                results.append({
                    'department': department,
                    'success': False,
                    'message': str(e)
                })
        
        return jsonify({
            'success': True,
            'message': f'Processed {len(departments)} departments',
            'data': results
        }), 200
        
    except Exception as e:
        logger.error(f"Bulk regenerate error: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Bulk regeneration failed: {str(e)}'
        }), 500

# Error handlers
@global_admin_bp.errorhandler(403)
def forbidden(error):
    return jsonify({
        'success': False,
        'message': 'Admin access required'
    }), 403

@global_admin_bp.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'message': 'Resource not found'
    }), 404

@global_admin_bp.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'message': 'Internal server error'
    }), 500
