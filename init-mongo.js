// MongoDB initialization script
db = db.getSiblingDB('ibpipeline');

// Create collections
db.createCollection('users');
db.createCollection('deals');

// Create indexes
db.users.createIndex({ "username": 1 }, { unique: true });
db.users.createIndex({ "email": 1 }, { unique: true });
db.deals.createIndex({ "clientName": 1 });
db.deals.createIndex({ "currentStage": 1 });
db.deals.createIndex({ "createdAt": -1 });

// Create initial admin user (password should be hashed in production)
db.users.insertOne({
    username: "admin",
    email: "admin@ibpipeline.com",
    password: "$2a$10$xQnhLzZ3QQWG8Y5P3vZXxO5YxEqV5n5kgZHqR5f5X5f5X5f5X5f5u", // 'admin123'
    role: "ADMIN",
    active: true,
    createdAt: new Date(),
    updatedAt: new Date()
});

print('Database initialized successfully');
