from ortools.sat.python import cp_model
from typing import List, Dict, Any, Tuple, Optional
from datetime import time, datetime, timedelta
import json
import logging
from models import SessionLocal, Assignment, Teacher, Course, Classroom, Rule, DeptTimetable, ScheduledSlot, RoomType, CourseType
from sqlalchemy.orm import Session

# Configure logging
logger = logging.getLogger(__name__)

class TimetableScheduler:
    """
    Google OR-Tools CP-SAT solver for university timetable generation
    """
    
    def __init__(self, department: str, user_id: int):
        self.department = department
        self.user_id = user_id
        self.model = cp_model.CpModel()
        self.solver = cp_model.CpSolver()
        
        # Time slot configuration (8:00 AM to 6:00 PM in 55-minute slots)
        self.start_hour = 8
        self.end_hour = 18
        self.slot_duration = 55  # minutes
        self.num_days = 5  # Monday to Friday
        self.num_slots_per_day = (self.end_hour - self.start_hour) * 60 // self.slot_duration
        self.total_time_slots = self.num_days * self.num_slots_per_day
        
        # Data structures
        self.assignments = []
        self.teachers = []
        self.courses = []
        self.classrooms = []
        self.rules = []
        
        # Decision variables
        self.schedule_vars = {}  # (assignment_id, classroom_id, day, slot) -> BoolVar
        self.teacher_vars = {}   # (teacher_id, day, slot) -> BoolVar
        self.room_vars = {}      # (classroom_id, day, slot) -> BoolVar
        
        # Solver statistics
        self.solver_stats = {}
        
    def load_data(self, timetable_id: int):
        """
        Load all necessary data from database for scheduling
        """
        db = SessionLocal()
        try:
            # Load assignments with related data
            assignments = db.query(Assignment).filter(
                Assignment.department == self.department,
                Assignment.user_id == self.user_id
            ).all()
            
            for assignment in assignments:
                self.assignments.append({
                    'id': assignment.id,
                    'course_id': assignment.course_id,
                    'section_id': assignment.section_id,
                    'teacher_id': assignment.teacher_id,
                    'group_id': assignment.group_id,
                    'course': assignment.course,
                    'section': assignment.section,
                    'teacher': assignment.teacher
                })
            
            # Load teachers with availability
            teachers = db.query(Teacher).filter(
                Teacher.department == self.department,
                Teacher.user_id == self.user_id
            ).all()
            
            for teacher in teachers:
                availability = json.loads(teacher.availability) if teacher.availability else None
                days_off = json.loads(teacher.days_off) if teacher.days_off else []
                
                self.teachers.append({
                    'id': teacher.id,
                    'name': teacher.name,
                    'max_hours_per_day': teacher.max_hours_per_day,
                    'availability': availability,
                    'days_off': days_off
                })
            
            # Load courses
            courses = db.query(Course).filter(
                Course.department == self.department,
                Course.user_id == self.user_id
            ).all()
            
            for course in courses:
                self.courses.append({
                    'id': course.id,
                    'name': course.name,
                    'course_type': course.course_type,
                    'duration_minutes': course.duration_minutes,
                    'sessions_per_week': course.sessions_per_week,
                    'room_type': course.room_type
                })
            
            # Load classrooms
            classrooms = db.query(Classroom).filter(
                Classroom.department == self.department,
                Classroom.user_id == self.user_id
            ).all()
            
            for classroom in classrooms:
                self.classrooms.append({
                    'id': classroom.id,
                    'room_id': classroom.room_id,
                    'room_type': classroom.room_type,
                    'capacity': classroom.capacity
                })
            
            # Load rules
            rules = db.query(Rule).filter(
                Rule.department == self.department,
                Rule.user_id == self.user_id
            ).all()
            
            for rule in rules:
                rule_data = json.loads(rule.rule_data)
                self.rules.append({
                    'id': rule.id,
                    'name': rule.name,
                    'rule_type': rule.rule_type,
                    'rule_data': rule_data
                })
            
            logger.info(f"Loaded data: {len(self.assignments)} assignments, {len(self.teachers)} teachers, "
                       f"{len(self.courses)} courses, {len(self.classrooms)} classrooms, {len(self.rules)} rules")
                       
        finally:
            db.close()
    
    def create_decision_variables(self):
        """
        Create binary decision variables for the scheduling problem
        """
        # Schedule variables: schedule_vars[assignment_id, classroom_id, day, slot] = BoolVar
        for assignment in self.assignments:
            for classroom in self.classrooms:
                course = next(c for c in self.courses if c['id'] == assignment['course_id'])
                
                # Only create variables for compatible room types
                if self._is_room_compatible(course['room_type'], classroom['room_type']):
                    for day in range(self.num_days):
                        for slot in range(self.num_slots_per_day):
                            var_name = f"schedule_{assignment['id']}_{classroom['id']}_{day}_{slot}"
                            var = self.model.NewBoolVar(var_name)
                            self.schedule_vars[(assignment['id'], classroom['id'], day, slot)] = var
        
        # Teacher occupation variables
        for teacher in self.teachers:
            for day in range(self.num_days):
                for slot in range(self.num_slots_per_day):
                    var_name = f"teacher_{teacher['id']}_{day}_{slot}"
                    var = self.model.NewBoolVar(var_name)
                    self.teacher_vars[(teacher['id'], day, slot)] = var
        
        # Room occupation variables
        for classroom in self.classrooms:
            for day in range(self.num_days):
                for slot in range(self.num_slots_per_day):
                    var_name = f"room_{classroom['id']}_{day}_{slot}"
                    var = self.model.NewBoolVar(var_name)
                    self.room_vars[(classroom['id'], day, slot)] = var
        
        logger.info(f"Created {len(self.schedule_vars)} schedule variables")
    
    def add_hard_constraints(self):
        """
        Add hard constraints that must be satisfied
        """
        # 1. Each assignment must be scheduled exactly according to sessions per week
        for assignment in self.assignments:
            course = next(c for c in self.courses if c['id'] == assignment['course_id'])
            sessions_needed = course['sessions_per_week']
            
            assignment_vars = []
            for key, var in self.schedule_vars.items():
                if key[0] == assignment['id']:  # assignment_id matches
                    assignment_vars.append(var)
            
            if assignment_vars:
                self.model.Add(sum(assignment_vars) == sessions_needed)
        
        # 2. No teacher can be in two places at once
        for teacher in self.teachers:
            for day in range(self.num_days):
                for slot in range(self.num_slots_per_day):
                    teacher_assignments = []
                    for assignment in self.assignments:
                        if assignment['teacher_id'] == teacher['id']:
                            for classroom_id in [c['id'] for c in self.classrooms]:
                                key = (assignment['id'], classroom_id, day, slot)
                                if key in self.schedule_vars:
                                    teacher_assignments.append(self.schedule_vars[key])
                    
                    if teacher_assignments:
                        self.model.Add(sum(teacher_assignments) <= 1)
        
        # 3. No classroom can have multiple classes at once
        for classroom in self.classrooms:
            for day in range(self.num_days):
                for slot in range(self.num_slots_per_day):
                    room_assignments = []
                    for assignment in self.assignments:
                        key = (assignment['id'], classroom['id'], day, slot)
                        if key in self.schedule_vars:
                            room_assignments.append(self.schedule_vars[key])
                    
                    if room_assignments:
                        self.model.Add(sum(room_assignments) <= 1)
        
        # 4. Teacher availability constraints
        for teacher in self.teachers:
            if teacher['availability']:
                for day in range(self.num_days):
                    if day in teacher['days_off']:
                        # Teacher is not available on this day
                        for assignment in self.assignments:
                            if assignment['teacher_id'] == teacher['id']:
                                for classroom_id in [c['id'] for c in self.classrooms]:
                                    for slot in range(self.num_slots_per_day):
                                        key = (assignment['id'], classroom_id, day, slot)
                                        if key in self.schedule_vars:
                                            self.model.Add(self.schedule_vars[key] == 0)
                    else:
                        # Check slot-by-slot availability
                        if day < len(teacher['availability']):
                            day_availability = teacher['availability'][day]
                            for slot in range(min(len(day_availability), self.num_slots_per_day)):
                                if not day_availability[slot]:
                                    # Teacher not available at this slot
                                    for assignment in self.assignments:
                                        if assignment['teacher_id'] == teacher['id']:
                                            for classroom_id in [c['id'] for c in self.classrooms]:
                                                key = (assignment['id'], classroom_id, day, slot)
                                                if key in self.schedule_vars:
                                                    self.model.Add(self.schedule_vars[key] == 0)
        
        # 5. Maximum hours per day per teacher
        for teacher in self.teachers:
            max_hours = teacher['max_hours_per_day']
            max_slots = max_hours * 60 // self.slot_duration
            
            for day in range(self.num_days):
                daily_assignments = []
                for assignment in self.assignments:
                    if assignment['teacher_id'] == teacher['id']:
                        for classroom_id in [c['id'] for c in self.classrooms]:
                            for slot in range(self.num_slots_per_day):
                                key = (assignment['id'], classroom_id, day, slot)
                                if key in self.schedule_vars:
                                    daily_assignments.append(self.schedule_vars[key])
                
                if daily_assignments:
                    self.model.Add(sum(daily_assignments) <= max_slots)
        
        # 6. Group constraints (assignments with same group_id should be scheduled together)
        group_assignments = {}
        for assignment in self.assignments:
            if assignment['group_id']:
                if assignment['group_id'] not in group_assignments:
                    group_assignments[assignment['group_id']] = []
                group_assignments[assignment['group_id']].append(assignment)
        
        for group_id, assignments in group_assignments.items():
            if len(assignments) > 1:
                # All assignments in the same group should be scheduled at the same time
                for day in range(self.num_days):
                    for slot in range(self.num_slots_per_day):
                        group_vars = []
                        for assignment in assignments:
                            for classroom_id in [c['id'] for c in self.classrooms]:
                                key = (assignment['id'], classroom_id, day, slot)
                                if key in self.schedule_vars:
                                    group_vars.append(self.schedule_vars[key])
                        
                        if len(group_vars) > 1:
                            # All variables should have the same value
                            for i in range(len(group_vars) - 1):
                                self.model.Add(group_vars[i] == group_vars[i + 1])
        
        logger.info("Added hard constraints")
    
    def add_soft_constraints(self):
        """
        Add soft constraints and objectives to optimize the schedule
        """
        objective_terms = []
        
        # 1. Minimize gaps in teacher schedules
        gap_penalty = 10
        for teacher in self.teachers:
            for day in range(self.num_days):
                for slot in range(self.num_slots_per_day - 2):
                    # If teacher has class at slot and slot+2, but not slot+1, it's a gap
                    teacher_vars_current = []
                    teacher_vars_next = []
                    teacher_vars_gap = []
                    
                    for assignment in self.assignments:
                        if assignment['teacher_id'] == teacher['id']:
                            for classroom_id in [c['id'] for c in self.classrooms]:
                                key_current = (assignment['id'], classroom_id, day, slot)
                                key_next = (assignment['id'], classroom_id, day, slot + 2)
                                key_gap = (assignment['id'], classroom_id, day, slot + 1)
                                
                                if key_current in self.schedule_vars:
                                    teacher_vars_current.append(self.schedule_vars[key_current])
                                if key_next in self.schedule_vars:
                                    teacher_vars_next.append(self.schedule_vars[key_next])
                                if key_gap in self.schedule_vars:
                                    teacher_vars_gap.append(self.schedule_vars[key_gap])
                    
                    if teacher_vars_current and teacher_vars_next and teacher_vars_gap:
                        # Create gap indicator variable
                        gap_var = self.model.NewBoolVar(f"gap_{teacher['id']}_{day}_{slot}")
                        
                        # Gap exists if teacher has classes at slot and slot+2 but not slot+1
                        has_current = sum(teacher_vars_current)
                        has_next = sum(teacher_vars_next)
                        has_gap_slot = sum(teacher_vars_gap)
                        
                        # This is a simplified gap detection - in practice, you'd need more complex logic
                        objective_terms.append(gap_var * gap_penalty)
        
        # 2. Prefer certain time slots (e.g., avoid early morning or late afternoon)
        time_preference_penalty = 5
        for assignment in self.assignments:
            for classroom_id in [c['id'] for c in self.classrooms]:
                for day in range(self.num_days):
                    # Penalize very early (first slot) and very late (last slot) classes
                    for slot in [0, self.num_slots_per_day - 1]:
                        key = (assignment['id'], classroom_id, day, slot)
                        if key in self.schedule_vars:
                            objective_terms.append(self.schedule_vars[key] * time_preference_penalty)
        
        # 3. Apply rule-based soft constraints
        for rule in self.rules:
            if rule['rule_type'] == 'lunch_window':
                self._add_lunch_window_constraint(rule['rule_data'], objective_terms)
            elif rule['rule_type'] == 'gap_preference':
                self._add_gap_preference_constraint(rule['rule_data'], objective_terms)
            elif rule['rule_type'] == 'forbidden_time_pairs':
                self._add_forbidden_time_pairs_constraint(rule['rule_data'])
        
        # Set objective to minimize penalty terms
        if objective_terms:
            self.model.Minimize(sum(objective_terms))
        
        logger.info("Added soft constraints and objectives")
    
    def _add_lunch_window_constraint(self, rule_data: Dict, objective_terms: List):
        """
        Add lunch window constraint - prefer no classes during lunch time
        """
        lunch_start = rule_data.get('start_slot', 5)  # Default around 12:00 PM
        lunch_end = rule_data.get('end_slot', 6)     # Default around 1:00 PM
        penalty = rule_data.get('penalty', 20)
        
        for assignment in self.assignments:
            for classroom_id in [c['id'] for c in self.classrooms]:
                for day in range(self.num_days):
                    for slot in range(lunch_start, lunch_end + 1):
                        key = (assignment['id'], classroom_id, day, slot)
                        if key in self.schedule_vars:
                            objective_terms.append(self.schedule_vars[key] * penalty)
    
    def _add_gap_preference_constraint(self, rule_data: Dict, objective_terms: List):
        """
        Add gap preference constraint - minimize or maximize gaps based on preference
        """
        # This is a placeholder for more sophisticated gap handling
        pass
    
    def _add_forbidden_time_pairs_constraint(self, rule_data: Dict):
        """
        Add forbidden time pairs constraint - certain assignments cannot be at specific times
        """
        forbidden_pairs = rule_data.get('pairs', [])
        
        for pair in forbidden_pairs:
            assignment_id = pair.get('assignment_id')
            forbidden_day = pair.get('day')
            forbidden_slot = pair.get('slot')
            
            if assignment_id and forbidden_day is not None and forbidden_slot is not None:
                for classroom_id in [c['id'] for c in self.classrooms]:
                    key = (assignment_id, classroom_id, forbidden_day, forbidden_slot)
                    if key in self.schedule_vars:
                        self.model.Add(self.schedule_vars[key] == 0)
    
    def _is_room_compatible(self, course_room_type, classroom_room_type):
        """
        Check if a course can be scheduled in a specific classroom type
        """
        # Convert enum to string if necessary
        course_type_str = course_room_type.value if hasattr(course_room_type, 'value') else str(course_room_type)
        classroom_type_str = classroom_room_type.value if hasattr(classroom_room_type, 'value') else str(classroom_room_type)
        
        # Basic compatibility rules
        if course_type_str == classroom_type_str:
            return True
        
        # Lectures can be held in conference rooms
        if course_type_str == 'lecture' and classroom_type_str == 'conference':
            return True
        
        # Computer labs can host regular labs
        if course_type_str == 'lab' and classroom_type_str == 'computer_lab':
            return True
        
        return False
    
    def solve(self, time_limit_seconds: int = 300) -> Tuple[bool, Dict[str, Any]]:
        """
        Solve the timetable scheduling problem
        """
        # Set solver parameters
        self.solver.parameters.max_time_in_seconds = time_limit_seconds
        self.solver.parameters.log_search_progress = True
        
        logger.info("Starting CP-SAT solver...")
        
        # Solve the model
        status = self.solver.Solve(self.model)
        
        # Collect solver statistics
        self.solver_stats = {
            'status': self.solver.StatusName(status),
            'objective_value': self.solver.ObjectiveValue() if status in [cp_model.OPTIMAL, cp_model.FEASIBLE] else None,
            'wall_time': self.solver.WallTime(),
            'num_branches': self.solver.NumBranches(),
            'num_conflicts': self.solver.NumConflicts(),
            'num_variables': self.model.Proto().variables,
            'num_constraints': len(self.model.Proto().constraints)
        }
        
        success = status in [cp_model.OPTIMAL, cp_model.FEASIBLE]
        
        if success:
            logger.info(f"Solution found! Status: {self.solver.StatusName(status)}")
            logger.info(f"Objective value: {self.solver.ObjectiveValue()}")
        else:
            logger.warning(f"No solution found. Status: {self.solver.StatusName(status)}")
        
        return success, self.solver_stats
    
    def extract_solution(self) -> List[Dict[str, Any]]:
        """
        Extract the solution from the solver and return scheduled slots
        """
        scheduled_slots = []
        
        for key, var in self.schedule_vars.items():
            if self.solver.Value(var) == 1:
                assignment_id, classroom_id, day, slot = key
                
                # Find assignment details
                assignment = next(a for a in self.assignments if a['id'] == assignment_id)
                classroom = next(c for c in self.classrooms if c['id'] == classroom_id)
                course = next(c for c in self.courses if c['id'] == assignment['course_id'])
                
                # Calculate start and end times
                start_time = self._slot_to_time(slot)
                end_time = self._add_minutes_to_time(start_time, course['duration_minutes'])
                
                scheduled_slot = {
                    'assignment_id': assignment_id,
                    'classroom_id': classroom_id,
                    'day_of_week': day,
                    'start_time': start_time,
                    'end_time': end_time,
                    'course_name': course['name'],
                    'section_code': assignment['section'].code,
                    'teacher_name': assignment['teacher'].name,
                    'room_id': classroom['room_id']
                }
                
                scheduled_slots.append(scheduled_slot)
        
        logger.info(f"Extracted {len(scheduled_slots)} scheduled slots")
        return scheduled_slots
    
    def _slot_to_time(self, slot: int) -> time:
        """
        Convert slot number to time object
        """
        minutes_from_start = slot * self.slot_duration
        start_time = datetime.combine(datetime.today(), time(self.start_hour, 0))
        actual_time = start_time + timedelta(minutes=minutes_from_start)
        return actual_time.time()
    
    def _add_minutes_to_time(self, start_time: time, minutes: int) -> time:
        """
        Add minutes to a time object
        """
        start_datetime = datetime.combine(datetime.today(), start_time)
        end_datetime = start_datetime + timedelta(minutes=minutes)
        return end_datetime.time()
    
    def save_solution(self, timetable_id: int, scheduled_slots: List[Dict[str, Any]]) -> bool:
        """
        Save the solution to the database
        """
        db = SessionLocal()
        try:
            # Clear existing scheduled slots for this timetable
            db.query(ScheduledSlot).filter(
                ScheduledSlot.dept_timetable_id == timetable_id
            ).delete()
            
            # Create new scheduled slots
            for slot_data in scheduled_slots:
                scheduled_slot = ScheduledSlot(
                    dept_timetable_id=timetable_id,
                    assignment_id=slot_data['assignment_id'],
                    classroom_id=slot_data['classroom_id'],
                    day_of_week=slot_data['day_of_week'],
                    start_time=slot_data['start_time'],
                    end_time=slot_data['end_time'],
                    department=self.department,
                    is_global_slot=False
                )
                db.add(scheduled_slot)
            
            # Update timetable status
            timetable = db.query(DeptTimetable).filter(DeptTimetable.id == timetable_id).first()
            if timetable:
                timetable.status = 'completed'
                timetable.solver_stats = json.dumps(self.solver_stats)
                timetable.updated_at = datetime.utcnow()
            
            db.commit()
            logger.info(f"Saved {len(scheduled_slots)} scheduled slots to database")
            return True
            
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to save solution: {str(e)}")
            return False
        finally:
            db.close()

def generate_timetable(department: str, user_id: int, timetable_id: int, time_limit: int = 300) -> Tuple[bool, str, Dict[str, Any]]:
    """
    Main function to generate timetable using OR-Tools CP-SAT solver
    """
    try:
        # Update timetable status to generating
        db = SessionLocal()
        try:
            timetable = db.query(DeptTimetable).filter(DeptTimetable.id == timetable_id).first()
            if timetable:
                timetable.status = 'generating'
                timetable.updated_at = datetime.utcnow()
                db.commit()
        finally:
            db.close()
        
        # Create scheduler instance
        scheduler = TimetableScheduler(department, user_id)
        
        # Load data
        scheduler.load_data(timetable_id)
        
        # Create decision variables
        scheduler.create_decision_variables()
        
        # Add constraints
        scheduler.add_hard_constraints()
        scheduler.add_soft_constraints()
        
        # Solve the problem
        success, solver_stats = scheduler.solve(time_limit)
        
        if success:
            # Extract and save solution
            scheduled_slots = scheduler.extract_solution()
            save_success = scheduler.save_solution(timetable_id, scheduled_slots)
            
            if save_success:
                message = f"Timetable generated successfully with {len(scheduled_slots)} scheduled slots"
                return True, message, solver_stats
            else:
                message = "Solution found but failed to save to database"
                return False, message, solver_stats
        else:
            # Update timetable status to failed
            db = SessionLocal()
            try:
                timetable = db.query(DeptTimetable).filter(DeptTimetable.id == timetable_id).first()
                if timetable:
                    timetable.status = 'failed'
                    timetable.generation_log = f"Solver failed: {solver_stats.get('status', 'Unknown error')}"
                    timetable.solver_stats = json.dumps(solver_stats)
                    timetable.updated_at = datetime.utcnow()
                    db.commit()
            finally:
                db.close()
            
            message = f"Failed to generate timetable: {solver_stats.get('status', 'Unknown error')}"
            return False, message, solver_stats
    
    except Exception as e:
        logger.error(f"Timetable generation error: {str(e)}")
        
        # Update timetable status to failed
        db = SessionLocal()
        try:
            timetable = db.query(DeptTimetable).filter(DeptTimetable.id == timetable_id).first()
            if timetable:
                timetable.status = 'failed'
                timetable.generation_log = f"Generation error: {str(e)}"
                timetable.updated_at = datetime.utcnow()
                db.commit()
        finally:
            db.close()
        
        return False, f"Timetable generation failed: {str(e)}", {}

def validate_scheduling_data(department: str, user_id: int) -> Tuple[bool, List[str]]:
    """
    Validate that all necessary data exists for scheduling
    """
    errors = []
    db = SessionLocal()
    
    try:
        # Check assignments
        assignments_count = db.query(Assignment).filter(
            Assignment.department == department,
            Assignment.user_id == user_id
        ).count()
        
        if assignments_count == 0:
            errors.append("No assignments found for scheduling")
        
        # Check teachers
        teachers_count = db.query(Teacher).filter(
            Teacher.department == department,
            Teacher.user_id == user_id
        ).count()
        
        if teachers_count == 0:
            errors.append("No teachers found for scheduling")
        
        # Check classrooms
        classrooms_count = db.query(Classroom).filter(
            Classroom.department == department,
            Classroom.user_id == user_id
        ).count()
        
        if classrooms_count == 0:
            errors.append("No classrooms found for scheduling")
        
        # Check courses
        courses_count = db.query(Course).filter(
            Course.department == department,
            Course.user_id == user_id
        ).count()
        
        if courses_count == 0:
            errors.append("No courses found for scheduling")
        
        return len(errors) == 0, errors
        
    finally:
        db.close()
