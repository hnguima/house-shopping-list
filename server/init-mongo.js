// MongoDB initialization script
// This script runs when the MongoDB container starts for the first time

print("Starting MongoDB initialization...");

// Switch to the shopping list database
db = db.getSiblingDB("shopping_list_db");

// Create collections with validation
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "createdAt"],
      properties: {
        email: {
          bsonType: "string",
          description: "must be a string and is required",
        },
        password: {
          bsonType: "string",
          description: "must be a string",
        },
        username: {
          bsonType: "string",
          description: "must be a string",
        },
        profilePhoto: {
          bsonType: "string",
          description: "must be a string",
        },
        preferences: {
          bsonType: "object",
          properties: {
            theme: {
              enum: ["light", "dark"],
              description: "must be either light or dark",
            },
            language: {
              bsonType: "string",
              description: "must be a string",
            },
          },
        },
        googleId: {
          bsonType: "string",
          description: "must be a string",
        },
        createdAt: {
          bsonType: "long",
          description: "must be a Unix timestamp (long) and is required",
        },
        updatedAt: {
          bsonType: "long",
          description: "must be a Unix timestamp (long)",
        },
      },
    },
  },
});

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ googleId: 1 }, { unique: true, sparse: true });
db.users.createIndex({ username: 1 }, { unique: true, sparse: true });
db.users.createIndex({ createdAt: 1 });

// Shopping Lists collection schema and indexes
db.createCollection("shopping_lists", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["user_id", "name", "archived", "items", "createdAt"],
      properties: {
        user_id: {
          bsonType: "objectId",
          description: "must be an objectId and is required",
        },
        name: {
          bsonType: "string",
          description: "must be a string and is required",
        },
        description: {
          bsonType: "string",
          description: "must be a string",
        },
        archived: {
          bsonType: "bool",
          description: "must be a boolean and is required",
        },
        items: {
          bsonType: "array",
          description: "must be an array and is required",
          items: {
            bsonType: "object",
            required: ["id", "name", "quantity", "completed", "createdAt"],
            properties: {
              id: {
                bsonType: "string",
                description: "must be a string and is required",
              },
              name: {
                bsonType: "string",
                description: "must be a string and is required",
              },
              quantity: {
                bsonType: "int",
                minimum: 1,
                description: "must be an integer >= 1 and is required",
              },
              category: {
                bsonType: "string",
                description: "must be a string",
              },
              notes: {
                bsonType: "string",
                description: "must be a string",
              },
              completed: {
                bsonType: "bool",
                description: "must be a boolean and is required",
              },
              createdAt: {
                bsonType: "long",
                description: "must be a Unix timestamp (long) and is required",
              },
              updatedAt: {
                bsonType: "long",
                description: "must be a Unix timestamp (long)",
              },
            },
          },
        },
        createdAt: {
          bsonType: "long",
          description: "must be a Unix timestamp (long) and is required",
        },
        updatedAt: {
          bsonType: "long",
          description: "must be a Unix timestamp (long)",
        },
      },
    },
  },
});

// Create indexes for shopping lists
db.shopping_lists.createIndex({ user_id: 1 });
db.shopping_lists.createIndex({ user_id: 1, archived: 1 });
db.shopping_lists.createIndex({ user_id: 1, updatedAt: -1 });
db.shopping_lists.createIndex({ createdAt: 1 });

print("MongoDB initialization completed successfully.");
print("Database: shopping_list_db");
print("Collections created: users, shopping_lists");
print(
  "Indexes created on: email (unique), googleId (unique, sparse), username (unique, sparse), createdAt"
);
print(
  "Shopping lists indexes: user_id, user_id+archived, user_id+updatedAt, createdAt"
);
