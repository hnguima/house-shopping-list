// MongoDB initialization script
// This script runs when the MongoDB container starts for the first time

print('Starting MongoDB initialization...');

// Switch to the shopping list database
db = db.getSiblingDB('shopping_list_db');

// Create collections with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "createdAt"],
      properties: {
        email: {
          bsonType: "string",
          description: "must be a string and is required"
        },
        password: {
          bsonType: "string",
          description: "must be a string"
        },
        username: {
          bsonType: "string",
          description: "must be a string"
        },
        profilePhoto: {
          bsonType: "string",
          description: "must be a string"
        },
        preferences: {
          bsonType: "object",
          properties: {
            theme: {
              enum: ["light", "dark"],
              description: "must be either light or dark"
            },
            language: {
              bsonType: "string",
              description: "must be a string"
            }
          }
        },
        googleId: {
          bsonType: "string",
          description: "must be a string"
        },
        createdAt: {
          bsonType: "date",
          description: "must be a date and is required"
        },
        updatedAt: {
          bsonType: "date",
          description: "must be a date"
        }
      }
    }
  }
});

// Create indexes for better performance
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "googleId": 1 }, { unique: true, sparse: true });
db.users.createIndex({ "username": 1 }, { unique: true, sparse: true });
db.users.createIndex({ "createdAt": 1 });

print('MongoDB initialization completed successfully.');
print('Database: shopping_list_db');
print('Collections created: users');
print('Indexes created on: email (unique), googleId (unique, sparse), username (unique, sparse), createdAt');
