import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

// Base API URL configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

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

// User Types
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

// Timetable Types
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
  availability?: string;
  days_off?: string;
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
  rule_type: string;
  rule_data: string;
  department: string;
  created_at: string;
}

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

// Request Types
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
  rule_type: string;
  rule_data: Record<string, any>;
}

// Step Requests for Wizard
export interface Step1SectionsRequest {
  sections: SectionCreateRequest[];
}

export interface Step2TeachersRequest {
  teachers: TeacherCreateRequest[];
}

export interface Step3CoursesRequest {
  courses: CourseCreateRequest[];
}

export interface Step4ClassroomsRequest {
  classrooms: ClassroomCreateRequest[];
}

export interface Step5AssignmentsRequest {
  assignments: AssignmentCreateRequest[];
}

export interface Step6RulesRequest {
  rules: RuleCreateRequest[];
}

export interface Step7ReviewRequest {
  timetable_name: string;
}

// Create Axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('access_token');
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log request in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    }
    
    return config;
  },
  (error: AxiosError) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for handling responses and errors
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log response in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`API Response: ${response.status} ${response.config.url}`);
    }
    
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any & { _retry?: boolean };
    
    // Handle 401 Unauthorized errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = localStorage.getItem('refresh_token');
      
      if (refreshToken) {
        try {
          // Attempt to refresh token
          const refreshResponse = await axios.post(
            `${API_BASE_URL}/auth/refresh`,
            {},
            {
              headers: {
                Authorization: `Bearer ${refreshToken}`,
              },
            }
          );
          
          if (refreshResponse.data.success) {
            const newToken = refreshResponse.data.data.access_token;
            localStorage.setItem('access_token', newToken);
            
            // Retry original request with new token
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            
            return apiClient(originalRequest);
          }
        } catch (refreshError) {
          // Refresh failed, clear tokens and redirect to login
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          
          // Redirect to login page
          if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
            window.location.href = '/login';
          }
        }
      } else {
        // No refresh token, redirect to login
        if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
          window.location.href = '/login';
        }
      }
    }
    
    // Handle network errors
    if (!error.response) {
      console.error('Network error:', error.message);
      throw new Error('Network error. Please check your internet connection.');
    }
    
    // Handle other HTTP errors  
    const errorMessage = (error.response.data as any)?.message || 
                        error.response.statusText || 
                        'An unexpected error occurred';
    
    console.error(`API Error ${error.response.status}:`, errorMessage);
    
    // Create a more user-friendly error object
    const apiError = {
      status: error.response.status,
      message: errorMessage,
      data: error.response.data,
    };
    
    return Promise.reject(apiError);
  }
);

// API Methods
export const api = {
  // Authentication
  auth: {
    login: (data: LoginRequest): Promise<AxiosResponse<ApiResponse<AuthResponse>>> =>
      apiClient.post('/auth/login', data),
    
    signup: (data: SignupRequest): Promise<AxiosResponse<ApiResponse<AuthResponse>>> =>
      apiClient.post('/auth/signup', data),
    
    me: (): Promise<AxiosResponse<ApiResponse<User>>> =>
      apiClient.get('/auth/me'),
    
    logout: (): Promise<AxiosResponse<ApiResponse>> =>
      apiClient.post('/auth/logout'),
    
    refresh: (): Promise<AxiosResponse<ApiResponse<{ access_token: string }>>> =>
      apiClient.post('/auth/refresh'),
    
    validate: (): Promise<AxiosResponse<ApiResponse<{ valid: boolean; user: User }>>> =>
      apiClient.get('/auth/validate'),
  },

  // Department APIs
  dept: {
    // Sections
    getSections: (): Promise<AxiosResponse<ApiResponse<Section[]>>> =>
      apiClient.get('/dept/sections'),
    
    createSections: (data: Step1SectionsRequest): Promise<AxiosResponse<ApiResponse>> =>
      apiClient.post('/dept/sections/step1', data),
    
    // Teachers
    getTeachers: (): Promise<AxiosResponse<ApiResponse<Teacher[]>>> =>
      apiClient.get('/dept/teachers'),
    
    createTeachers: (data: Step2TeachersRequest): Promise<AxiosResponse<ApiResponse>> =>
      apiClient.post('/dept/teachers/step2', data),
    
    // Courses
    getCourses: (): Promise<AxiosResponse<ApiResponse<Course[]>>> =>
      apiClient.get('/dept/courses'),
    
    createCourses: (data: Step3CoursesRequest): Promise<AxiosResponse<ApiResponse>> =>
      apiClient.post('/dept/courses/step3', data),
    
    // Classrooms
    getClassrooms: (): Promise<AxiosResponse<ApiResponse<Classroom[]>>> =>
      apiClient.get('/dept/classrooms'),
    
    createClassrooms: (data: Step4ClassroomsRequest): Promise<AxiosResponse<ApiResponse>> =>
      apiClient.post('/dept/classrooms/step4', data),
    
    // Assignments
    getAssignments: (): Promise<AxiosResponse<ApiResponse<Assignment[]>>> =>
      apiClient.get('/dept/assignments'),
    
    createAssignments: (data: Step5AssignmentsRequest): Promise<AxiosResponse<ApiResponse>> =>
      apiClient.post('/dept/assignments/step5', data),
    
    // Rules
    getRules: (): Promise<AxiosResponse<ApiResponse<Rule[]>>> =>
      apiClient.get('/dept/rules'),
    
    createRules: (data: Step6RulesRequest): Promise<AxiosResponse<ApiResponse>> =>
      apiClient.post('/dept/rules/step6', data),
    
    // Timetables
    getTimetables: (): Promise<AxiosResponse<ApiResponse<DeptTimetable[]>>> =>
      apiClient.get('/dept/timetables'),
    
    createTimetable: (data: Step7ReviewRequest): Promise<AxiosResponse<ApiResponse>> =>
      apiClient.post('/dept/timetables/step7', data),
    
    getTimetableResults: (timetableId: number): Promise<AxiosResponse<ApiResponse<{
      timetable: DeptTimetable;
      scheduled_slots: ScheduledSlot[];
    }>>> =>
      apiClient.get(`/dept/timetables/${timetableId}/results`),
  },

  // Admin APIs
  admin: {
    getDashboard: (): Promise<AxiosResponse<ApiResponse<{
      overview: Record<string, number>;
      department_statistics: Record<string, any>;
      global_scheduler: Record<string, any>;
    }>>> =>
      apiClient.get('/admin/dashboard'),
    
    getDepartments: (): Promise<AxiosResponse<ApiResponse<any[]>>> =>
      apiClient.get('/admin/departments'),
    
    initializeScheduler: (): Promise<AxiosResponse<ApiResponse>> =>
      apiClient.post('/admin/scheduler/initialize'),
    
    detectConflicts: (data?: { departments?: string[] }): Promise<AxiosResponse<ApiResponse<{
      conflicts: any[];
      departments_checked: string[];
    }>>> =>
      apiClient.post('/admin/conflicts/detect', data),
    
    synchronizeDepartments: (data: { departments: string[] }): Promise<AxiosResponse<ApiResponse>> =>
      apiClient.post('/admin/departments/synchronize', data),
    
    getGlobalSlots: (): Promise<AxiosResponse<ApiResponse<any[]>>> =>
      apiClient.get('/admin/slots/global'),
    
    reserveSlots: (data: { department: string; timetable_id: number; slot_ids: number[] }): Promise<AxiosResponse<ApiResponse>> =>
      apiClient.post('/admin/slots/reserve', data),
    
    releaseSlots: (data: { department: string; timetable_id: number }): Promise<AxiosResponse<ApiResponse>> =>
      apiClient.post('/admin/slots/release', data),
    
    getSharedResources: (params?: { day?: number; start_slot?: number; end_slot?: number; room_type?: string }): Promise<AxiosResponse<ApiResponse<any[]>>> =>
      apiClient.get('/admin/resources/shared', { params }),
    
    getUtilizationReport: (): Promise<AxiosResponse<ApiResponse<{
      classroom_utilization: any[];
      teacher_utilization: any[];
      summary: Record<string, any>;
    }>>> =>
      apiClient.get('/admin/reports/utilization'),
    
    getConflictsReport: (): Promise<AxiosResponse<ApiResponse<{
      total_conflicts: number;
      departments_with_conflicts: number;
      conflicts_by_department: Record<string, any>;
    }>>> =>
      apiClient.get('/admin/reports/conflicts'),
    
    validateSystem: (): Promise<AxiosResponse<ApiResponse<{
      is_valid: boolean;
      errors: string[];
      validation_timestamp: string;
    }>>> =>
      apiClient.get('/admin/validate'),
    
    bulkRegenerateTimetables: (data: { departments: string[]; force?: boolean }): Promise<AxiosResponse<ApiResponse<any[]>>> =>
      apiClient.post('/admin/timetables/bulk-regenerate', data),
  },

  // Utility methods
  health: (): Promise<AxiosResponse<ApiResponse>> =>
    apiClient.get('/health'),
};

// Helper functions
export const handleApiError = (error: any): string => {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error.message) {
    return error.message;
  }
  
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  
  return 'An unexpected error occurred';
};

export const isApiError = (error: any): boolean => {
  return error && (error.status || error.response?.status);
};

export const getErrorStatus = (error: any): number | null => {
  return error.status || error.response?.status || null;
};

// Export the configured axios instance for direct use if needed
export default apiClient;