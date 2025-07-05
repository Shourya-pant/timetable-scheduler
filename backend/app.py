from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from datetime import timedelta
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import database initialization
from database import init_db

def create_app():
    app = Flask(__name__)
    
    # Configuration
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=1)
    app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)
    
    # Initialize CORS with proper configuration for development and Clacky environment
    CORS(app, 
         origins=['http://localhost:3000', 'https://*.clackypaas.com'],
         supports_credentials=True,
         allow_headers=['Content-Type', 'Authorization'],
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
    
    # Initialize JWT
    jwt = JWTManager(app)
    
    # Initialize database
    init_db()
    
    # Root route handler
    @app.route('/')
    def root():
        return jsonify({
            'name': 'University Timetable Scheduler API',
            'version': '1.0.0',
            'description': 'A comprehensive timetable scheduling system for universities',
            'status': 'running',
            'endpoints': {
                'health': '/api/health',
                'auth': '/api/auth',
                'department': '/api/dept',
                'admin': '/api/admin'
            }
        })
    
    # Register blueprints
    from routes.auth import auth_bp
    from routes.dept import dept_bp
    from routes.global_admin import global_admin_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(dept_bp, url_prefix='/api/dept')
    app.register_blueprint(global_admin_bp, url_prefix='/api/admin')
    
    # Health check endpoint
    @app.route('/api/health')
    def health_check():
        return jsonify({'status': 'ok', 'message': 'University Scheduler API is running'})
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Not found'}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({'error': 'Internal server error'}), 500
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5001, debug=True)