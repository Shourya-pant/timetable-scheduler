from ortools.sat.python import cp_model
from typing import List, Dict, Any, Tuple, Optional
from datetime import time, datetime, timedelta
import json
import logging
from models import SessionLocal, ScheduledSlot, DeptTimetable, Classroom, Assignment, Teacher, Course
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

# Configure logging
logger = logging.getLogger(__name__)

class GlobalScheduler:
    """
    Global scheduling coordinator to prevent cross-department conflicts
    and synchronize department timetables
    """
    
    def __init__(self):
        self.global_slots = {}  # (classroom_id, day, slot) -> occupying_department
        self.department_timetables = {}
        self.shared_resources = {}  # Resources that can be used by multiple departments
        
    def load_global_state(self):
        """
        Load the current global scheduling state from all departments
        """
        db = SessionLocal()
        try:
            # Load all scheduled slots marked as global
            global_slots = db.query(ScheduledSlot).filter(
                ScheduledSlot.is_global_slot == True
            ).all()
            
            for slot in global_slots:
                key = (slot.classroom_id, slot.day_of_week, self._time_to_slot(slot.start_time))
                self.global_slots[key] = slot.department
            
            # Load department timetables
            timetables = db.query(DeptTimetable).filter(
                DeptTimetable.status == 'completed'
            ).all()
            
            for timetable in timetables:
                if timetable.department not in self.department_timetables:
                    self.department_timetables[timetable.department] = []
                self.department_timetables[timetable.department].append(timetable)
            
            # Load shared resources (classrooms that can be used by multiple departments)
            shared_classrooms = db.query(Classroom).filter(
                Classroom.department == 'Shared'
            ).all()
            
            for classroom in shared_classrooms:
                self.shared_resources[classroom.id] = {
                    'room_id': classroom.room_id,
                    'room_type': classroom.room_type,
                    'capacity': classroom.capacity,
                    'departments': []  # Departments that can use this resource
                }
            
            logger.info(f"Loaded global state: {len(self.global_slots)} global slots, "
                       f"{len(self.department_timetables)} department timetables, "
                       f"{len(self.shared_resources)} shared resources")
                       
        finally:
            db.close()
    
    def check_resource_conflicts(self, department: str, timetable_id: int) -> Tuple[bool, List[Dict[str, Any]]]:
        """
        Check for conflicts between a department's timetable and global slots
        """
        conflicts = []
        db = SessionLocal()
        
        try:
            # Get all scheduled slots for this timetable
            scheduled_slots = db.query(ScheduledSlot).filter(
                ScheduledSlot.dept_timetable_id == timetable_id
            ).all()
            
            for slot in scheduled_slots:
                # Check if this slot conflicts with global reservations
                key = (slot.classroom_id, slot.day_of_week, self._time_to_slot(slot.start_time))
                
                if key in self.global_slots:
                    occupying_dept = self.global_slots[key]
                    if occupying_dept != department:
                        # Get classroom and assignment details
                        classroom = db.query(Classroom).filter(Classroom.id == slot.classroom_id).first()
                        assignment = db.query(Assignment).filter(Assignment.id == slot.assignment_id).first()
                        
                        conflict = {
                            'slot_id': slot.id,
                            'classroom_id': slot.classroom_id,
                            'room_id': classroom.room_id if classroom else 'Unknown',
                            'day_of_week': slot.day_of_week,
                            'start_time': slot.start_time.strftime('%H:%M'),
                            'end_time': slot.end_time.strftime('%H:%M'),
                            'requesting_department': department,
                            'occupying_department': occupying_dept,
                            'course_name': assignment.course.name if assignment and assignment.course else 'Unknown',
                            'section_code': assignment.section.code if assignment and assignment.section else 'Unknown'
                        }
                        conflicts.append(conflict)
            
            return len(conflicts) == 0, conflicts
            
        finally:
            db.close()
    
    def reserve_global_slots(self, department: str, timetable_id: int, slot_ids: List[int]) -> bool:
        """
        Reserve specific slots globally for a department
        """
        db = SessionLocal()
        try:
            # Update specified slots to be global
            updated_count = db.query(ScheduledSlot).filter(
                and_(
                    ScheduledSlot.dept_timetable_id == timetable_id,
                    ScheduledSlot.id.in_(slot_ids)
                )
            ).update({
                'is_global_slot': True
            }, synchronize_session=False)
            
            # Update local global_slots tracking
            reserved_slots = db.query(ScheduledSlot).filter(
                and_(
                    ScheduledSlot.dept_timetable_id == timetable_id,
                    ScheduledSlot.id.in_(slot_ids),
                    ScheduledSlot.is_global_slot == True
                )
            ).all()
            
            for slot in reserved_slots:
                key = (slot.classroom_id, slot.day_of_week, self._time_to_slot(slot.start_time))
                self.global_slots[key] = department
            
            db.commit()
            logger.info(f"Reserved {updated_count} global slots for department {department}")
            return True
            
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to reserve global slots: {str(e)}")
            return False
        finally:
            db.close()
    
    def release_global_slots(self, department: str, timetable_id: int) -> bool:
        """
        Release all global slots for a department's timetable
        """
        db = SessionLocal()
        try:
            # Get slots to be released
            slots_to_release = db.query(ScheduledSlot).filter(
                and_(
                    ScheduledSlot.dept_timetable_id == timetable_id,
                    ScheduledSlot.is_global_slot == True
                )
            ).all()
            
            # Update database
            db.query(ScheduledSlot).filter(
                and_(
                    ScheduledSlot.dept_timetable_id == timetable_id,
                    ScheduledSlot.is_global_slot == True
                )
            ).update({
                'is_global_slot': False
            }, synchronize_session=False)
            
            # Update local tracking
            for slot in slots_to_release:
                key = (slot.classroom_id, slot.day_of_week, self._time_to_slot(slot.start_time))
                if key in self.global_slots and self.global_slots[key] == department:
                    del self.global_slots[key]
            
            db.commit()
            logger.info(f"Released {len(slots_to_release)} global slots for department {department}")
            return True
            
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to release global slots: {str(e)}")
            return False
        finally:
            db.close()
    
    def get_available_shared_resources(self, day: int, start_slot: int, end_slot: int, room_type: str = None) -> List[Dict[str, Any]]:
        """
        Get available shared resources for a specific time range
        """
        available_resources = []
        
        for resource_id, resource_info in self.shared_resources.items():
            if room_type and resource_info['room_type'].value != room_type:
                continue
                
            # Check if resource is available during the requested time
            is_available = True
            for slot in range(start_slot, end_slot):
                key = (resource_id, day, slot)
                if key in self.global_slots:
                    is_available = False
                    break
            
            if is_available:
                available_resources.append({
                    'classroom_id': resource_id,
                    'room_id': resource_info['room_id'],
                    'room_type': resource_info['room_type'].value,
                    'capacity': resource_info['capacity']
                })
        
        return available_resources
    
    def synchronize_department_timetables(self, departments: List[str]) -> Dict[str, Any]:
        """
        Synchronize timetables across multiple departments to resolve conflicts
        """
        sync_results = {
            'success': True,
            'conflicts_resolved': 0,
            'departments_synchronized': [],
            'errors': []
        }
        
        db = SessionLocal()
        try:
            department_slots = {}
            
            # Load current slots for all departments
            for department in departments:
                timetable = db.query(DeptTimetable).filter(
                    and_(
                        DeptTimetable.department == department,
                        DeptTimetable.status == 'completed'
                    )
                ).order_by(DeptTimetable.updated_at.desc()).first()
                
                if timetable:
                    slots = db.query(ScheduledSlot).filter(
                        ScheduledSlot.dept_timetable_id == timetable.id
                    ).all()
                    department_slots[department] = slots
            
            # Detect conflicts
            conflicts = self._detect_inter_department_conflicts(department_slots)
            
            # Resolve conflicts using priority-based approach
            resolved_conflicts = self._resolve_conflicts_by_priority(conflicts, department_slots, db)
            
            sync_results['conflicts_resolved'] = len(resolved_conflicts)
            sync_results['departments_synchronized'] = departments
            
            # Update global state
            self.load_global_state()
            
            db.commit()
            
        except Exception as e:
            db.rollback()
            sync_results['success'] = False
            sync_results['errors'].append(str(e))
            logger.error(f"Synchronization failed: {str(e)}")
        finally:
            db.close()
        
        return sync_results
    
    def _detect_inter_department_conflicts(self, department_slots: Dict[str, List]) -> List[Dict[str, Any]]:
        """
        Detect conflicts between department timetables
        """
        conflicts = []
        slot_usage = {}  # (classroom_id, day, time_slot) -> [departments]
        
        # Map all slot usage
        for department, slots in department_slots.items():
            for slot in slots:
                time_slot = self._time_to_slot(slot.start_time)
                key = (slot.classroom_id, slot.day_of_week, time_slot)
                
                if key not in slot_usage:
                    slot_usage[key] = []
                slot_usage[key].append({
                    'department': department,
                    'slot': slot
                })
        
        # Find conflicts (multiple departments using same resource at same time)
        for key, usage_list in slot_usage.items():
            if len(usage_list) > 1:
                classroom_id, day, time_slot = key
                conflict = {
                    'classroom_id': classroom_id,
                    'day_of_week': day,
                    'time_slot': time_slot,
                    'conflicting_departments': [u['department'] for u in usage_list],
                    'conflicting_slots': [u['slot'] for u in usage_list]
                }
                conflicts.append(conflict)
        
        return conflicts
    
    def _resolve_conflicts_by_priority(self, conflicts: List[Dict[str, Any]], department_slots: Dict[str, List], db: Session) -> List[Dict[str, Any]]:
        """
        Resolve conflicts using department priority and slot flexibility
        """
        resolved = []
        
        # Department priority order (admin configurable in real implementation)
        dept_priority = {
            'Computer Science': 1,
            'Engineering': 2,
            'Mathematics': 3,
            'Physics': 4
        }
        
        for conflict in conflicts:
            # Sort departments by priority
            depts = conflict['conflicting_departments']
            sorted_depts = sorted(depts, key=lambda d: dept_priority.get(d, 999))
            
            # Give the slot to highest priority department
            winner_dept = sorted_depts[0]
            
            # Remove conflicting slots from other departments
            for i, dept in enumerate(sorted_depts[1:], 1):
                # Find the conflicting slot for this department
                dept_slot = next(
                    (slot for slot in conflict['conflicting_slots'] 
                     if slot.department == dept), None
                )
                
                if dept_slot:
                    # Try to reschedule this slot
                    rescheduled = self._attempt_reschedule(dept_slot, db)
                    if rescheduled:
                        resolved.append({
                            'original_slot': dept_slot,
                            'new_slot': rescheduled,
                            'department': dept
                        })
                    else:
                        # Remove the slot if can't reschedule
                        db.delete(dept_slot)
                        logger.warning(f"Removed conflicting slot for {dept} - could not reschedule")
        
        return resolved
    
    def _attempt_reschedule(self, slot: ScheduledSlot, db: Session) -> Optional[ScheduledSlot]:
        """
        Attempt to reschedule a conflicting slot to an available time
        """
        # Get assignment details
        assignment = db.query(Assignment).filter(Assignment.id == slot.assignment_id).first()
        if not assignment:
            return None
        
        # Get teacher availability
        teacher = assignment.teacher
        if not teacher or not teacher.availability:
            return None
        
        availability = json.loads(teacher.availability)
        
        # Find alternative slots
        for day in range(5):  # Monday to Friday
            if day in json.loads(teacher.days_off) if teacher.days_off else []:
                continue
                
            if day < len(availability):
                day_availability = availability[day]
                for time_slot in range(len(day_availability)):
                    if day_availability[time_slot]:
                        # Check if this slot is free globally
                        key = (slot.classroom_id, day, time_slot)
                        if key not in self.global_slots:
                            # Create new scheduled slot
                            new_slot = ScheduledSlot(
                                dept_timetable_id=slot.dept_timetable_id,
                                assignment_id=slot.assignment_id,
                                classroom_id=slot.classroom_id,
                                day_of_week=day,
                                start_time=self._slot_to_time(time_slot),
                                end_time=self._slot_to_time(time_slot + 1),
                                department=slot.department,
                                is_global_slot=slot.is_global_slot
                            )
                            
                            # Remove old slot and add new one
                            db.delete(slot)
                            db.add(new_slot)
                            return new_slot
        
        return None
    
    def _time_to_slot(self, time_obj: time) -> int:
        """
        Convert time object to slot number
        """
        start_hour = 8
        slot_duration = 55  # minutes
        
        time_minutes = time_obj.hour * 60 + time_obj.minute
        start_minutes = start_hour * 60
        
        return (time_minutes - start_minutes) // slot_duration
    
    def _slot_to_time(self, slot: int) -> time:
        """
        Convert slot number to time object
        """
        start_hour = 8
        slot_duration = 55  # minutes
        
        minutes_from_start = slot * slot_duration
        start_time = datetime.combine(datetime.today(), time(start_hour, 0))
        actual_time = start_time + timedelta(minutes=minutes_from_start)
        return actual_time.time()
    
    def get_global_schedule_summary(self) -> Dict[str, Any]:
        """
        Get a summary of the global scheduling state
        """
        summary = {
            'total_global_slots': len(self.global_slots),
            'departments_with_timetables': len(self.department_timetables),
            'shared_resources': len(self.shared_resources),
            'department_slot_counts': {},
            'resource_utilization': {}
        }
        
        # Count slots by department
        for key, department in self.global_slots.items():
            if department not in summary['department_slot_counts']:
                summary['department_slot_counts'][department] = 0
            summary['department_slot_counts'][department] += 1
        
        # Calculate resource utilization
        total_slots = 5 * 10  # 5 days * 10 slots per day
        for resource_id in self.shared_resources.keys():
            used_slots = sum(1 for key in self.global_slots.keys() if key[0] == resource_id)
            utilization = (used_slots / total_slots) * 100 if total_slots > 0 else 0
            summary['resource_utilization'][resource_id] = round(utilization, 2)
        
        return summary
    
    def validate_global_consistency(self) -> Tuple[bool, List[str]]:
        """
        Validate that the global scheduling state is consistent
        """
        errors = []
        db = SessionLocal()
        
        try:
            # Check for orphaned global slots
            global_slots_in_db = db.query(ScheduledSlot).filter(
                ScheduledSlot.is_global_slot == True
            ).all()
            
            db_slot_keys = set()
            for slot in global_slots_in_db:
                key = (slot.classroom_id, slot.day_of_week, self._time_to_slot(slot.start_time))
                db_slot_keys.add(key)
            
            memory_slot_keys = set(self.global_slots.keys())
            
            # Check for inconsistencies
            orphaned_in_memory = memory_slot_keys - db_slot_keys
            orphaned_in_db = db_slot_keys - memory_slot_keys
            
            if orphaned_in_memory:
                errors.append(f"Found {len(orphaned_in_memory)} orphaned slots in memory")
            
            if orphaned_in_db:
                errors.append(f"Found {len(orphaned_in_db)} orphaned slots in database")
            
            # Check for double-booking
            slot_count = {}
            for slot in global_slots_in_db:
                key = (slot.classroom_id, slot.day_of_week, self._time_to_slot(slot.start_time))
                if key not in slot_count:
                    slot_count[key] = 0
                slot_count[key] += 1
            
            double_booked = [(key, count) for key, count in slot_count.items() if count > 1]
            if double_booked:
                errors.append(f"Found {len(double_booked)} double-booked slots")
            
            return len(errors) == 0, errors
            
        finally:
            db.close()

# Global scheduler instance
global_scheduler = GlobalScheduler()

def initialize_global_scheduler():
    """
    Initialize the global scheduler with current state
    """
    global_scheduler.load_global_state()
    logger.info("Global scheduler initialized")

def check_department_conflicts(department: str, timetable_id: int) -> Tuple[bool, List[Dict[str, Any]]]:
    """
    Check for conflicts between a department's timetable and global reservations
    """
    return global_scheduler.check_resource_conflicts(department, timetable_id)

def reserve_department_slots(department: str, timetable_id: int, slot_ids: List[int]) -> bool:
    """
    Reserve slots globally for a department
    """
    return global_scheduler.reserve_global_slots(department, timetable_id, slot_ids)

def release_department_slots(department: str, timetable_id: int) -> bool:
    """
    Release department's global slot reservations
    """
    return global_scheduler.release_global_slots(department, timetable_id)

def synchronize_all_departments(departments: List[str]) -> Dict[str, Any]:
    """
    Synchronize timetables across multiple departments
    """
    return global_scheduler.synchronize_department_timetables(departments)

def get_shared_resources(day: int, start_slot: int, end_slot: int, room_type: str = None) -> List[Dict[str, Any]]:
    """
    Get available shared resources for scheduling
    """
    return global_scheduler.get_available_shared_resources(day, start_slot, end_slot, room_type)

def get_global_summary() -> Dict[str, Any]:
    """
    Get global scheduling summary
    """
    return global_scheduler.get_global_schedule_summary()

def validate_global_state() -> Tuple[bool, List[str]]:
    """
    Validate global scheduling consistency
    """
    return global_scheduler.validate_global_consistency()
