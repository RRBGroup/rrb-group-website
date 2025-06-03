const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = express();
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// ... existing code ... 

// Add rate limiting for sensitive endpoints
const sensitiveLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

// Endpoint to get Stripe public key
app.get('/api/get-stripe-key', sensitiveLimiter, (req, res) => {
    res.json({ publicKey: process.env.STRIPE_PUBLISHABLE_KEY });
});

// Endpoint to get bank details
app.get('/api/get-bank-details', sensitiveLimiter, (req, res) => {
    res.json({
        bsb: process.env.BANK_BSB,
        accountNumber: process.env.BANK_ACCOUNT_NUMBER
    });
});

// ... existing code ... 