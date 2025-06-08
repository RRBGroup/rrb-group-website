require('dotenv').config();

// Test environment variables are loaded
console.log('Environment variables loaded successfully');
console.log('Admin User:', process.env.ADMIN_USER);
console.log('Admin Pass:', process.env.ADMIN_PASS);
console.log('JWT Secret:', process.env.JWT_SECRET);
console.log('SMTP Pass:', process.env.SMTP_PASS);
console.log('Node Env:', process.env.NODE_ENV); 