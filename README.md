# University Timetable Scheduler

A comprehensive web application for automated university timetable generation using constraint programming and optimization algorithms.

## Overview

The University Timetable Scheduler is a full-stack web application designed to automate the complex process of creating academic timetables for universities. It uses Google OR-Tools constraint solver to handle scheduling conflicts and optimize resource allocation while providing an intuitive web interface for administrators and department heads.

### Key Features

- **Multi-role Authentication**: Separate interfaces for Global Administrators and Department Heads
- **7-Step Timetable Creation Wizard**: Guided process for setting up sections, teachers, courses, classrooms, assignments, rules, and review
- **Advanced Constraint Solving**: Powered by Google OR-Tools for optimal scheduling
- **Real-time Conflict Detection**: Automatic detection and resolution of scheduling conflicts
- **Auto-save Functionality**: Prevents data loss during the timetable creation process
- **PDF Export**: Generate and download timetables in PDF format
- **Global Resource Management**: Central administration of shared resources across departments
- **Interactive Calendar View**: Visual representation of generated timetables

## Technology Stack

### Frontend
- **React 18.2.0** with TypeScript
- **React Router DOM** for navigation
- **Tailwind CSS** for styling
- **Axios** for API communication
- **JWT Decode** for authentication
- **jsPDF & html2canvas** for PDF generation

### Backend
- **Flask 2.3.3** with Python
- **SQLAlchemy 2.0.23** for database ORM
- **Flask-JWT-Extended** for authentication
- **Google OR-Tools 9.8.3296** for constraint solving
- **bcrypt** for password hashing
- **Pydantic** for data validation

### Database
- **PostgreSQL** with connection pooling
- **Comprehensive schema** for users, courses, teachers, classrooms, and scheduling

## Prerequisites

Before running the application, ensure you have:

- **Node.js** (v14 or higher)
- **Python** (v3.8 or higher)
- **PostgreSQL** (v12 or higher)
- **npm** or **yarn** package manager
- **pip** for Python package management

## Installation and Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd university-scheduler
```

### 2. Database Setup

Create a PostgreSQL database:

```bash
PGPASSWORD=VTjgkaUv createdb -h 127.0.0.1 -U postgres university_scheduler
```

### 3. Backend Setup

Navigate to the backend directory and install dependencies:

```bash
cd backend
pip install -r requirements.txt
```

Initialize the database:

```bash
python -c "from database import init_db; init_db()"
```

### 4. Frontend Setup

Install frontend dependencies:

```bash
npm install
```

### 5. Environment Configuration

Create a `.env` file in the root directory with the following configuration:

```env
JWT_SECRET_KEY=your-super-secret-jwt-key-change-in-production-123456789
DATABASE_URL=postgresql://postgres:VTjgkaUv@127.0.0.1:5432/university_scheduler
FLASK_ENV=development
FLASK_DEBUG=True
CORS_ORIGINS=*.clackypaas.com,http://localhost:3000
```

**Important**: Change the JWT_SECRET_KEY to a secure value in production environments.

## Running the Application

### Development Mode

1. **Start the Backend Server**:
   ```bash
   cd backend
   python app.py
   ```
   The Flask server will run on `http://localhost:5000`

2. **Start the Frontend Development Server**:
   ```bash
   npm start
   ```
   The React application will run on `http://localhost:3000`

3. **Access the Application**:
   Open your browser and navigate to `http://localhost:3000`

## User Guide

### User Roles and Capabilities

#### Global Administrator
- **System Overview**: View university-wide statistics and metrics
- **Department Management**: Monitor all departments and their timetables
- **Conflict Resolution**: Detect and resolve scheduling conflicts across departments
- **Global Scheduler**: Initialize and manage shared resources
- **Resource Monitoring**: Track classroom and teacher utilization

#### Department Head
- **Department Dashboard**: Manage department-specific resources
- **Timetable Creation**: Use the 7-step wizard to create optimized timetables
- **Resource Management**: Add and configure sections, teachers, courses, and classrooms
- **Rule Configuration**: Set scheduling preferences and constraints
- **Results Viewing**: Review generated timetables and export to PDF

### Timetable Creation Wizard

The application features a comprehensive 7-step wizard for creating timetables:

#### Step 1: Sections
- Add class sections with unique codes
- Configure section-specific requirements
- Set capacity and department assignments

#### Step 2: Teachers
- Add teaching staff with contact information
- Configure availability schedules
- Set maximum daily teaching hours
- Define days off and preferences

#### Step 3: Courses
- Create course definitions with duration and frequency
- Specify course types (Lecture, Lab)
- Set room requirements (Lecture Hall, Computer Lab, etc.)
- Configure sessions per week

#### Step 4: Classrooms
- Add classroom resources with capacity
- Specify room types and equipment
- Set availability schedules
- Configure department access

#### Step 5: Assignments
- Create course-to-section assignments
- Assign teachers to specific courses
- Group multiple sections for shared courses
- Validate assignment completeness

#### Step 6: Rules
- Configure scheduling preferences
- Set lunch break windows
- Define maximum lectures per day
- Create forbidden time slot combinations
- Set gap preferences between classes

#### Step 7: Review
- Review all configuration settings
- Name the timetable
- Generate optimized schedule
- View solver statistics and conflicts

## API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Token refresh
- `DELETE /api/auth/logout` - User logout

### Department Endpoints
- `GET /api/dept/dashboard` - Department statistics
- `GET/POST /api/dept/sections` - Section management
- `GET/POST /api/dept/teachers` - Teacher management
- `GET/POST /api/dept/courses` - Course management
- `GET/POST /api/dept/classrooms` - Classroom management
- `GET/POST /api/dept/assignments` - Assignment management
- `GET/POST /api/dept/rules` - Rule configuration
- `POST /api/dept/generate-timetable` - Timetable generation
- `GET /api/dept/timetables` - List department timetables

### Admin Endpoints
- `GET /api/admin/dashboard` - Global statistics
- `GET /api/admin/departments` - All departments overview
- `POST /api/admin/initialize-scheduler` - Global scheduler setup
- `GET /api/admin/detect-conflicts` - Cross-department conflict detection

## Database Schema

### Core Tables

#### Users
- Stores user information, roles, and department assignments
- Supports Global Admin and Department Head roles

#### Academic Resources
- **Sections**: Class sections with codes and capacity
- **Teachers**: Faculty with availability and constraints
- **Courses**: Course definitions with requirements
- **Classrooms**: Physical resources with capacity and type
- **Assignments**: Course-to-section-to-teacher mappings

#### Scheduling
- **Rules**: Scheduling constraints and preferences
- **DeptTimetables**: Generated timetable metadata
- **ScheduledSlots**: Individual time slot assignments

### Key Relationships
- Users have many timetables (department heads)
- Assignments link courses, sections, and teachers
- Scheduled slots reference assignments and classrooms
- Rules apply to specific departments

## Project Structure

```
university-scheduler/
├── backend/                    # Flask backend application
│   ├── routes/                # API route blueprints
│   │   ├── auth.py           # Authentication routes
│   │   ├── dept.py           # Department management routes
│   │   └── global_admin.py   # Admin routes
│   ├── app.py                # Main Flask application
│   ├── models.py             # Database models
│   ├── database.py           # Database configuration
│   ├── scheduler.py          # OR-Tools scheduling logic
│   ├── global_scheduler.py   # Global resource management
│   ├── auth.py               # Authentication utilities
│   ├── middleware.py         # JWT middleware
│   ├── schemas.py            # Pydantic validation schemas
│   └── requirements.txt      # Python dependencies
├── src/                      # React frontend application
│   ├── components/           # Reusable React components
│   │   ├── wizard/          # Timetable creation wizard steps
│   │   ├── CalendarGrid.tsx # Timetable visualization
│   │   ├── AvailabilitySelector.tsx
│   │   ├── DashboardCard.tsx
│   │   └── ProtectedRoute.tsx
│   ├── pages/               # Main application pages
│   │   ├── Landing.tsx      # Landing page
│   │   ├── Login.tsx        # Authentication
│   │   ├── Signup.tsx       # User registration
│   │   ├── AdminDashboard.tsx
│   │   ├── DeptDashboard.tsx
│   │   ├── CreateTimetable.tsx
│   │   └── Results.tsx
│   ├── context/             # React context providers
│   │   └── AuthContext.tsx  # Authentication state
│   ├── utils/               # Utility functions
│   │   ├── api.ts           # API communication
│   │   └── pdfExport.ts     # PDF generation
│   ├── types/               # TypeScript type definitions
│   └── App.tsx              # Main application component
├── public/                  # Static assets
├── package.json            # Frontend dependencies
└── README.md              # Project documentation
```

## Usage Examples

### Creating a New Timetable

1. **Login as Department Head**
2. **Navigate to Department Dashboard**
3. **Click "Create New Timetable"**
4. **Follow the 7-step wizard**:
   - Add your class sections
   - Configure teacher availability
   - Define courses and their requirements
   - Set up classroom resources
   - Create course assignments
   - Configure scheduling rules
   - Review and generate the timetable

### Managing Global Resources (Admin)

1. **Login as Global Administrator**
2. **View system-wide statistics**
3. **Initialize global scheduler** for shared resources
4. **Detect conflicts** across all departments
5. **Monitor resource utilization** and department activity

### Exporting Timetables

1. **Navigate to Results page** after timetable generation
2. **Review the generated schedule** in calendar view
3. **Click "Export to PDF"** to download the timetable
4. **Share the PDF** with faculty and students

## Development Notes

### Auto-save Functionality
- The timetable creation wizard automatically saves progress every 5 seconds
- Data is stored in browser localStorage to prevent loss
- Users are warned before leaving pages with unsaved changes

### Conflict Detection
- Real-time validation during wizard steps
- Cross-department conflict detection for shared resources
- Constraint solver integration for optimization

### Constraint Solving
- Google OR-Tools CP-SAT solver for optimal scheduling
- Configurable soft and hard constraints
- Performance metrics and solving statistics

### Error Handling
- Comprehensive error messages for user guidance
- API error handling with user-friendly feedback
- Graceful degradation for network issues

## Troubleshooting

### Common Issues

#### Database Connection Failed
- Verify PostgreSQL is running
- Check database credentials in `.env` file
- Ensure database `university_scheduler` exists

#### Frontend Build Errors
- Clear node_modules: `rm -rf node_modules && npm install`
- Check Node.js version compatibility
- Verify all dependencies are installed

#### Backend Import Errors
- Ensure Python virtual environment is activated
- Install missing packages: `pip install -r requirements.txt`
- Check Python version compatibility

#### Timetable Generation Fails
- Verify all wizard steps are completed
- Check for conflicting constraints
- Review solver logs in the generation results

#### CORS Issues
- Verify CORS_ORIGINS in `.env` file
- Check Flask-CORS configuration in `app.py`
- Ensure frontend and backend URLs match

### Performance Optimization

#### For Large Datasets
- Increase solver timeout in `scheduler.py`
- Optimize database queries with indexes
- Consider batch processing for multiple timetables

#### Memory Usage
- Monitor OR-Tools solver memory consumption
- Implement pagination for large data lists
- Use database connection pooling

## Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request with detailed description

### Code Standards
- Follow TypeScript/JavaScript best practices
- Use Python PEP 8 style guidelines
- Include comprehensive error handling
- Write unit tests for new features

### Testing
- Run frontend tests: `npm test`
- Test backend endpoints with Postman or curl
- Verify database migrations work correctly

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Contact

For questions, issues, or contributions, please contact the development team or create an issue in the project repository.

## Maintenance

### Regular Tasks
- Update dependencies regularly for security
- Monitor database performance and optimize queries
- Review and update scheduling constraints based on user feedback
- Backup database regularly in production environments

### Scaling Considerations
- Consider microservices architecture for larger deployments
- Implement caching for frequently accessed data
- Use load balancing for high-traffic scenarios
- Monitor application performance and optimize bottlenecks

---

*University Timetable Scheduler - Automating academic scheduling with intelligent constraint solving.*
