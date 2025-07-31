from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
import os
from datetime import datetime

class Database:
    _instance = None
    _client = None
    _db = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Database, cls).__new__(cls)
        return cls._instance
    
    def initialize(self, mongo_uri, database_name):
        """Initialize the database connection"""
        try:
            self._client = MongoClient(mongo_uri)
            # Test connection
            self._client.admin.command('ping')
            self._db = self._client[database_name]
            print(f"[Database] Connected to MongoDB: {database_name}")
            
            # Create indexes
            self._create_indexes()
            
        except ConnectionFailure as e:
            print(f"[Database] Failed to connect to MongoDB: {e}")
            raise
    
    def _create_indexes(self):
        """Create database indexes for optimization"""
        # Users collection indexes
        users = self._db.users
        
        # Create indexes safely, handling conflicts
        self._create_index_safely(users, "email", unique=True)
        self._create_index_safely(users, "username", unique=True, sparse=True)
        self._create_index_safely(users, "google_id", unique=True, sparse=True)
        
        print("[Database] Indexes created successfully")
    
    def _create_index_safely(self, collection, field, **kwargs):
        """Create an index safely, handling existing index conflicts"""
        try:
            collection.create_index(field, **kwargs)
        except Exception as e:
            if "IndexKeySpecsConflict" in str(e) or "already exists" in str(e):
                print(f"[Database] Index on '{field}' already exists, skipping...")
            else:
                print(f"[Database] Warning: Could not create index on '{field}': {e}")
                # Don't raise the exception, just log it
    
    @property
    def client(self):
        return self._client
    
    @property
    def db(self):
        return self._db
    
    def get_collection(self, collection_name):
        """Get a collection from the database"""
        return self._db[collection_name]
    
    def close(self):
        """Close the database connection"""
        if self._client:
            self._client.close()
            print("[Database] Database connection closed")

# Global database instance
db = Database()
