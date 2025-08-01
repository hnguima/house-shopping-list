from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
import os

from config import config
from database import db
from auth_routes import auth_bp
from user_routes import user_bp
from shopping_routes import shopping_bp

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
    # CORS - Allow both HTTP and HTTPS for development flexibility
    # Server enforces HTTPS but allows HTTP frontends for local development
    if app.config['DEBUG']:
        CORS(app, 
             origins=[
                 'http://localhost:5173', 
                 'https://localhost:5173',
                 'http://localhost:3000',
                 'https://localhost:3000',
                 'https://shop-list-api.the-cube-lab.com',
                 'https://the-cube-lab.com',
                 'https://*.the-cube-lab.com',
                 'capacitor://localhost',  # Capacitor Android
                 'ionic://localhost',      # Ionic Android
                 'http://localhost',
                 'https://localhost',
                 'http://localhost:*',
                 'https://localhost:*',
                 'http://127.0.0.1:3000', 
                 'https://127.0.0.1:3000',
                 'http://localhost:8100',
                 'https://localhost:8100',
                 'http://127.0.0.1:8100',
                 'https://127.0.0.1:8100',
                 'http://127.0.0.1:5173',
                 'https://127.0.0.1:5173',
                 'http://10.0.2.2:3001'   # Android emulator
             ], 
             supports_credentials=True,
             allow_headers=['Content-Type', 'Authorization', 'X-Requested-With'],
             methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
    else:
        # In production, allow configured frontend URL and all cube lab domains
        # Also allow HTTP localhost for development access to production API
        allowed_origins = [app.config['FRONTEND_URL']]
        allowed_origins.extend([
            'http://localhost:5173',  # Allow HTTP frontend in development
            'https://localhost:5173',
            'http://localhost:3000',
            'https://localhost:3000',
            'https://shop-list-api.the-cube-lab.com',
            'https://the-cube-lab.com',
            'https://*.the-cube-lab.com',
            'capacitor://localhost',
            'ionic://localhost',
            'http://localhost',
            'https://localhost',
            'http://localhost:*',
            'https://localhost:*',
            'http://127.0.0.1:3000',
            'https://127.0.0.1:3000',
            'http://localhost:8100',
            'https://localhost:8100',
            'http://127.0.0.1:8100',
            'https://127.0.0.1:8100',
            'http://127.0.0.1:5173',
            'https://127.0.0.1:5173',
            'http://10.0.2.2:3001'
        ])
        CORS(app, 
             origins=allowed_origins, 
             supports_credentials=True,
             allow_headers=['Content-Type', 'Authorization', 'X-Requested-With'],
             methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
    
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
    app.register_blueprint(shopping_bp)
    
    # Import and register home routes
    from home_routes import home_bp
    app.register_blueprint(home_bp)
    
    # Add explicit OPTIONS handler for all routes to ensure CORS preflight works
    @app.before_request
    def handle_preflight():
        if request.method == "OPTIONS":
            response = app.make_default_options_response()
            headers = response.headers
            headers['Access-Control-Allow-Origin'] = request.headers.get('Origin', '*')
            headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
            headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
            headers['Access-Control-Allow-Credentials'] = 'true'
            return response
    
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
    
    # Check if we're running in Docker (presence of certificates directory)
    is_docker = os.path.exists('/app/certs')
    is_production = os.environ.get('FLASK_ENV') != 'development' or is_docker
    
    # Use Docker paths if in Docker, local paths otherwise
    if is_docker:
        cert_path = '/app/certs/cert.pem'
        key_path = '/app/certs/key.pem'
    else:
        cert_path = os.path.join(os.path.dirname(__file__), 'certs', 'cert.pem')
        key_path = os.path.join(os.path.dirname(__file__), 'certs', 'key.pem')
    
    print(f'Cert exists: {os.path.exists(cert_path)} - {cert_path}')
    print(f'Key exists: {os.path.exists(key_path)} - {key_path}')
    print(f'Running in Docker: {is_docker}')
    print(f'Production mode: {is_production}')
    print(f'FLASK_ENV: {os.environ.get("FLASK_ENV", "not_set")}')
    
    # Only start if SSL certificates are present - NO HTTP FALLBACK
    if os.path.exists(cert_path) and os.path.exists(key_path):
        print('Starting Flask with HTTPS/SSL...')
        try:
            app.run(
                host=app.config['HOST'],
                port=app.config['PORT'],
                debug=app.config['DEBUG'],
                ssl_context=(cert_path, key_path)
            )
        except Exception as e:
            print(f'SSL error: {e}')
            print('SSL certificates required. Exiting.')
            exit(1)
    else:
        print('ERROR: SSL certificates required! Server will not start without HTTPS.')
        print('Please ensure cert.pem and key.pem are available in the certs/ directory.')
        exit(1)
