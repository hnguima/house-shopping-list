from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
import os

from config import config
from database import db
from auth_routes import auth_bp
from user_routes import user_bp

# Load environment variables
load_dotenv()

def create_app(config_name=None):
    """Application factory pattern"""
    app = Flask(__name__)
    
    # Load configuration
    config_name = config_name or os.environ.get('FLASK_ENV', 'development')
    app.config.from_object(config[config_name])
    
    # Initialize extensions
    setup_extensions(app)
    
    # Initialize database
    setup_database(app)
    
    # Register blueprints
    register_blueprints(app)
    
    # Register error handlers
    register_error_handlers(app)
    
    return app

def setup_extensions(app):
    """Initialize Flask extensions"""
    # CORS - More permissive for development
    if app.config['DEBUG']:
        CORS(app, origins=['http://localhost:5173', 'http://localhost:3000'], supports_credentials=True)
    else:
        CORS(app, origins=[app.config['FRONTEND_URL']], supports_credentials=True)
    
    # JWT
    jwt = JWTManager(app)
    
    # Import session manager for token blacklisting
    from session_manager import TokenBlacklist
    
    # JWT error handlers
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({'message': 'Token has expired'}), 401
    
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({'message': 'Invalid token'}), 401
    
    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({'message': 'Authorization token required'}), 401
    
    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        """Check if token is in blacklist"""
        jti = jwt_payload['jti']
        return TokenBlacklist.is_token_blacklisted(jti)
    
    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        return jsonify({'message': 'Token has been revoked'}), 401

def setup_database(app):
    """Initialize database connection"""
    try:
        db.initialize(app.config['MONGO_URI'], app.config['DATABASE_NAME'])
        app.logger.info("Database initialized successfully")
    except Exception as e:
        app.logger.error(f"Database initialization failed: {e}")
        raise

def register_blueprints(app):
    """Register application blueprints"""
    app.register_blueprint(auth_bp)
    app.register_blueprint(user_bp)
    
    # Health check endpoint
    @app.route('/health')
    def health_check():
        return jsonify({
            'status': 'healthy',
            'service': 'shopping-list-api',
            'database': 'connected' if db.db is not None else 'disconnected'
        })
    
    # API info endpoint
    @app.route('/api')
    def api_info():
        return jsonify({
            'service': 'Shopping List API',
            'version': '1.0.0',
            'endpoints': {
                'auth': '/api/auth',
                'health': '/health'
            }
        })

def register_error_handlers(app):
    """Register global error handlers"""
    
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'message': 'Endpoint not found'}), 404
    
    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify({'message': 'Method not allowed'}), 405
    
    @app.errorhandler(500)
    def internal_error(error):
        app.logger.error(f"Internal server error: {error}")
        return jsonify({'message': 'Internal server error'}), 500

if __name__ == '__main__':
    app = create_app()
    
    # Run the application
    app.run(
        host=app.config['HOST'],
        port=app.config['PORT'],
        debug=app.config['DEBUG']
    )
