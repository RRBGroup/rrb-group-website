require('dotenv').config();
console.log('ADMIN_USER:', process.env.ADMIN_USER);
console.log('ADMIN_PASS:', process.env.ADMIN_PASS);
console.log('JWT_SECRET:', process.env.JWT_SECRET);
console.log('SMTP_PASS:', process.env.SMTP_PASS);
console.log('NODE_ENV:', process.env.NODE_ENV); 