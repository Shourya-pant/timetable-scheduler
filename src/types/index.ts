// User and Authentication Types
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'dept_head';
  department?: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'dept_head';
  department?: string;
}

// Academic Entities
export interface Section {
  id: number;
  code: string;
  department: string;
  created_at: string;
}

export interface Teacher {
  id: number;
  name: string;
  department: string;
  max_hours_per_day: number;
  availability?: string; // JSON string
  days_off?: string; // JSON string
  created_at: string;
}

export interface Course {
  id: number;
  name: string;
  course_type: 'lecture' | 'lab';
  duration_minutes: number;
  sessions_per_week: number;
  room_type: 'lecture' | 'lab' | 'computer_lab' | 'conference';
  department: string;
  created_at: string;
}

export interface Classroom {
  id: number;
  room_id: string;
  room_type: 'lecture' | 'lab' | 'computer_lab' | 'conference';
  capacity: number;
  department: string;
  created_at: string;
}

export interface Assignment {
  id: number;
  course_id: number;
  section_id: number;
  teacher_id: number;
  group_id?: string;
  department: string;
  created_at: string;
}

export interface Rule {
  id: number;
  name: string;
  rule_type: 'lunch_window' | 'max_lectures_per_day' | 'gap_preference' | 'forbidden_time_pairs';
  rule_data: string; // JSON string
  department: string;
  created_at: string;
}

// Timetable Types
export interface DeptTimetable {
  id: number;
  name: string;
  department: string;
  status: 'draft' | 'generating' | 'completed' | 'failed';
  generation_log?: string;
  solver_stats?: string;
  created_at: string;
  updated_at: string;
}

export interface ScheduledSlot {
  id: number;
  dept_timetable_id: number;
  assignment_id: number;
  classroom_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  department: string;
  is_global_slot: boolean;
  created_at: string;
  course_name?: string;
  section_code?: string;
  teacher_name?: string;
  room_id?: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Component Props Types
export interface DashboardCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'disabled';
  className?: string;
}

export interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'dept_head';
  requiredDepartment?: string;
  fallbackPath?: string;
}

// Wizard Step Types
export interface WizardData {
  sections: SectionCreateRequest[];
  teachers: TeacherCreateRequest[];
  courses: CourseCreateRequest[];
  classrooms: ClassroomCreateRequest[];
  assignments: AssignmentCreateRequest[];
  rules: RuleCreateRequest[];
  timetableName: string;
}

export interface StepProps {
  data: WizardData;
  onSubmit: (data: any) => void;
  onDataChange: (data: Partial<WizardData>) => void;
  isLoading: boolean;
}

// Request Types for Wizard Steps
export interface SectionCreateRequest {
  code: string;
}

export interface TeacherCreateRequest {
  name: string;
  max_hours_per_day?: number;
  availability?: boolean[][];
  days_off?: number[];
}

export interface CourseCreateRequest {
  name: string;
  course_type: 'lecture' | 'lab';
  duration_minutes?: number;
  sessions_per_week?: number;
  room_type: 'lecture' | 'lab' | 'computer_lab' | 'conference';
}

export interface ClassroomCreateRequest {
  room_id: string;
  room_type: 'lecture' | 'lab' | 'computer_lab' | 'conference';
  capacity: number;
}

export interface AssignmentCreateRequest {
  course_id: number;
  section_id: number;
  teacher_id: number;
  group_id?: string;
}

export interface RuleCreateRequest {
  name: string;
  rule_type: 'lunch_window' | 'max_lectures_per_day' | 'gap_preference' | 'forbidden_time_pairs';
  rule_data: Record<string, any>;
}

// Calendar and Scheduling Types
export interface TimeSlot {
  day: number;
  slot: number;
  startTime: string;
  endTime: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  timeSlot: TimeSlot;
  duration: number;
  color?: 'primary' | 'green' | 'blue' | 'purple' | 'orange' | 'red';
  isConflict?: boolean;
  isReadOnly?: boolean;
}

export interface CalendarGridProps {
  events: CalendarEvent[];
  onEventMove?: (eventId: string, newTimeSlot: TimeSlot) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onSlotClick?: (timeSlot: TimeSlot) => void;
  readOnly?: boolean;
  showConflicts?: boolean;
  highlightAvailableSlots?: boolean;
  className?: string;
}

export interface AvailabilitySelectorProps {
  availability: boolean[][];
  onAvailabilityChange: (availability: boolean[][]) => void;
  daysOff: number[];
  onDaysOffChange: (daysOff: number[]) => void;
  className?: string;
  disabled?: boolean;
}

// PDF Export Types
export interface ExportOptions {
  format: 'pdf';
  orientation: 'portrait' | 'landscape';
  includeCalendar: boolean;
  includeDetails: boolean;
  includeSummary: boolean;
  pageSize: 'a4' | 'a3' | 'letter';
}

// Admin Dashboard Types
export interface DashboardStats {
  overview: {
    total_departments: number;
    total_timetables: number;
    active_timetables: number;
    total_teachers: number;
    total_courses: number;
    total_classrooms: number;
    total_scheduled_slots: number;
    global_slots: number;
  };
  department_statistics: Record<string, {
    timetables: number;
    teachers: number;
    courses: number;
    classrooms: number;
  }>;
  global_scheduler: {
    total_global_slots: number;
    departments_with_timetables: number;
    shared_resources: number;
    department_slot_counts: Record<string, number>;
    resource_utilization: Record<string, number>;
  };
}

export interface Department {
  department: string;
  dept_head: {
    id: number;
    name: string;
    email: string;
  };
  timetables: Array<{
    id: number;
    name: string;
    status: string;
    created_at: string;
    updated_at: string;
  }>;
}

export interface ConflictData {
  slot_id: number;
  classroom_id: number;
  room_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  requesting_department: string;
  occupying_department: string;
  course_name: string;
  section_code: string;
}

// Results and Timetable Display Types
export interface TimetableResults {
  timetable: DeptTimetable;
  scheduled_slots: ScheduledSlot[];
}

export interface TimetableFilter {
  department?: string;
  status?: 'draft' | 'generating' | 'completed' | 'failed';
  date_from?: string;
  date_to?: string;
}

// Validation and Error Types
export interface ValidationError {
  field: string;
  message: string;
}

export interface BulkResponse {
  success: boolean;
  message: string;
  created_count: number;
  errors?: string[];
}

export interface TimetableGenerationResponse {
  success: boolean;
  message: string;
  timetable_id?: number;
  generation_log?: string;
  solver_stats?: Record<string, any>;
}

// Auth Context Types
export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  signup: (userData: SignupRequest) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
  hasRole: (role: string) => boolean;
  canAccessDepartment: (department?: string) => boolean;
}

// Utility Types
export type UserRole = 'admin' | 'dept_head';
export type RoomType = 'lecture' | 'lab' | 'computer_lab' | 'conference';
export type CourseType = 'lecture' | 'lab';
export type TimetableStatus = 'draft' | 'generating' | 'completed' | 'failed';
export type RuleType = 'lunch_window' | 'max_lectures_per_day' | 'gap_preference' | 'forbidden_time_pairs';

// Form and Input Types
export interface FormFieldError {
  [key: string]: string;
}

export interface StepValidation {
  isValid: boolean;
  errors: FormFieldError;
  canProceed: boolean;
}

// Time and Schedule Utilities
export interface TimeSlotInfo {
  index: number;
  time: string;
  label: string;
}

export interface DayInfo {
  index: number;
  name: string;
  short: string;
}

// Statistics and Analytics Types
export interface TimetableStats {
  total_slots: number;
  scheduled_slots: number;
  unscheduled_assignments: number;
  teacher_conflicts: number;
  room_conflicts: number;
  constraint_violations: number;
}

export interface UtilizationReport {
  classroom_utilization: Array<{
    classroom_id: number;
    room_id: string;
    department: string;
    room_type: string;
    capacity: number;
    occupied_slots: number;
    total_slots: number;
    utilization_rate: number;
  }>;
  teacher_utilization: Array<{
    teacher_id: number;
    teacher_name: string;
    department: string;
    assignments: number;
    scheduled_slots: number;
    max_hours_per_day: number;
  }>;
  summary: {
    total_classrooms: number;
    total_teachers: number;
    average_classroom_utilization: number;
  };
}

// Global Scheduler Types
export interface GlobalSlot {
  id: number;
  department: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  classroom_id: number;
  room_id: string;
  course_name: string;
  section_code: string;
  teacher_name: string;
  created_at: string;
}

export interface SynchronizationResult {
  success: boolean;
  conflicts_resolved: number;
  departments_synchronized: string[];
  errors: string[];
}
