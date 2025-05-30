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
console.log('Loaded from .env:', process.env.ADMIN_USER, process.env.ADMIN_PASS);
const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;
console.log('=== SERVER.JS STARTED ===');
console.log('Test env:', process.env.TEST_ENV);
const multer = require('multer');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, 'admin/uploads'));
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage });

// Middleware
app.use(helmet());

// Rate limiter for admin login
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: { success: false, message: 'Too many login attempts, please try again later.' }
});

// Parse JSON bodies
app.use(bodyParser.json());

// CORS for production
if (process.env.NODE_ENV === 'production') {
    app.use(cors({
        origin: 'https://rrbgroup.au',
        optionsSuccessStatus: 200
    }));
} else {
    // Development CORS configuration
    app.use(cors({
        origin: ['http://127.0.0.1:5500', 'http://localhost:5500', 'http://localhost:3000'],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
        credentials: true,
        optionsSuccessStatus: 200
    }));
}

// API Routes
app.post('/api/process-payment', async (req, res) => {
    try {
        const { paymentMethodId, amount, customerInfo, plan, period } = req.body;
        const orderRef = `VO-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        // Apply 2.5% surcharge for credit card payments
        const surchargeRate = 0.025;
        const amountWithSurcharge = Math.round(amount * (1 + surchargeRate));

        // Create a customer
        const customer = await stripe.customers.create({
            email: customerInfo.email,
            name: customerInfo.name,
            metadata: {
                company: customerInfo.company,
                abn: customerInfo.abn
            }
        });

        // Create a payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountWithSurcharge * 100, // Convert to cents
            currency: 'aud',
            payment_method: paymentMethodId,
            customer: customer.id,
            confirm: true,
            payment_method_types: ['card'], // Only allow card payments
            metadata: {
                company: customerInfo.company,
                plan: plan,
                period: period,
                orderRef: orderRef
            }
        });

        // Save payment to database
        const payment = new Payment({
            orderRef,
            customerInfo,
            paymentInfo: {
                amount: amountWithSurcharge,
                currency: 'aud',
                plan,
                period,
                paymentMethod: 'Credit Card',
                status: 'pending'
            },
            stripeInfo: {
                customerId: customer.id,
                paymentIntentId: paymentIntent.id,
                status: paymentIntent.status
            }
        });
        await payment.save();

        // Send confirmation email to customer
        await sendConfirmationEmail(customerInfo, {
            amount: amountWithSurcharge,
            plan,
            period,
            paymentMethod: 'Credit Card',
            orderRef
        });

        // Send notification to business owner
        await sendBusinessNotification({
            amount: amountWithSurcharge,
            plan,
            period,
            paymentMethod: 'Credit Card',
            orderRef
        }, customerInfo);

        res.json({ success: true, paymentIntentId: paymentIntent.id, orderRef });
    } catch (error) {
        console.error('Payment Error:', error);
        res.json({ success: false, error: error.message });
    }
});

app.post('/api/process-bank-transfer', async (req, res) => {
    try {
        const { orderRef, amount, customerInfo, plan, period } = req.body;

        // Save payment to database
        const payment = new Payment({
            orderRef,
            customerInfo,
            paymentInfo: {
                amount,
                currency: 'aud',
                plan,
                period,
                paymentMethod: 'Bank Transfer',
                status: 'pending'
            }
        });
        await payment.save();

        // Send notification to business owner
        await sendBusinessNotification({
            amount,
            plan,
            period,
            paymentMethod: 'Bank Transfer',
            orderRef,
            status: 'pending'
        }, customerInfo);

        // Send confirmation email to customer
        await sendConfirmationEmail(customerInfo, {
            amount,
            plan,
            period,
            paymentMethod: 'Bank Transfer',
            orderRef
        });

        res.json({ success: true, orderRef });
    } catch (error) {
        console.error('Bank Transfer Error:', error);
        res.json({ success: false, error: error.message });
    }
});

// Serve static files
app.use(express.static(__dirname));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.use('/admin/uploads', express.static(path.join(__dirname, 'admin/uploads')));

// Handle all routes to serve HTML files (should be after API routes)
app.get('*', (req, res, next) => {
    if (req.path.endsWith('.html')) {
        res.sendFile(path.join(__dirname, req.path));
    } else {
        next();
    }
});

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/rrb-group', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Add auto-increment for serial number
let clientSerialCounter = 1;

// Define Client Schema
const clientSchema = new mongoose.Schema({
    serial: { type: Number, unique: true },
    repName: { type: String, required: true },
    companyName: { type: String, required: true },
    companyAddress: { type: String, required: true },
    abn: { type: String, required: true },
    joiningDate: { type: Date, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    country: { type: String, required: true },
    state: { type: String },
    optional1: String,
    optional2: String,
    documents: [{
        filename: String,
        path: String,
        uploadDate: { type: Date, default: Date.now }
    }],
    history: [{
        timestamp: { type: Date, default: Date.now },
        changedBy: String, // admin username if available
        changes: [{
            field: String,
            oldValue: mongoose.Schema.Types.Mixed,
            newValue: mongoose.Schema.Types.Mixed
        }],
        note: String
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    active: { type: String, enum: ['Y', 'N'], default: 'Y' },
    paymentEffectiveUntil: { type: Date },
});

const Client = mongoose.model('Client', clientSchema);

// Define Payment Schema
const paymentSchema = new mongoose.Schema({
    orderRef: { type: String, required: true, unique: true },
    customerInfo: {
        name: { type: String, required: true },
        email: { type: String, required: true },
        company: { type: String, required: true },
        abn: { type: String }
    },
    paymentInfo: {
        amount: { type: Number, required: true },
        currency: { type: String, required: true },
        plan: { type: String, required: true },
        period: { type: String, required: true },
        paymentMethod: { type: String, required: true },
        status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' }
    },
    stripeInfo: {
        customerId: { type: String },
        paymentIntentId: { type: String },
        paymentMethodId: { type: String },
        status: { type: String }
    },
    retryCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Payment = mongoose.model('Payment', paymentSchema);

// Email configuration
const transporter = nodemailer.createTransport({
    host: 'ventraip.email',  // Matching your working Outlook configuration
    port: 587,
    secure: false, // TLS
    auth: {
        user: 'contact@rrbgroup.au',
        pass: process.env.SMTP_PASS
    },
    tls: {
        rejectUnauthorized: false // Accept self-signed certificates
    },
    debug: true, // Enable debug logging
    logger: true // Enable logger
});

// Verify SMTP connection configuration
transporter.verify(function(error, success) {
    if (error) {
        console.error('SMTP Connection Error:', error);
    } else {
        console.log('SMTP Server is ready to take our messages');
    }
});

// Business owner email
const BUSINESS_EMAIL = 'contact@rrbgroup.au';

// Stripe webhook secret
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Admin Authentication Middleware
const JWT_SECRET = process.env.JWT_SECRET;

const authenticateAdmin = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.admin = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

// Admin Login
app.post('/api/admin/login', loginLimiter, async (req, res) => {
    const { username, password } = req.body;
    console.log('Login attempt:', { username, password });
    console.log('Expected:', { ADMIN_USER, ADMIN_PASS });
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ success: true, token });
        // ... rest of your code ...
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

// Handle Stripe webhooks
app.post('/webhook', bodyParser.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];

    try {
        const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

        // Handle the event
        switch (event.type) {
            case 'payment_intent.succeeded':
                const paymentIntent = event.data.object;
                await handleSuccessfulPayment(paymentIntent);
                break;
            case 'payment_intent.payment_failed':
                const failedPayment = event.data.object;
                await handleFailedPayment(failedPayment);
                break;
        }

        res.json({received: true});
    } catch (err) {
        console.error('Webhook Error:', err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
    }
});

// Helper function to send confirmation email
async function sendConfirmationEmail(customerInfo, paymentInfo) {
    console.log('Attempting to send confirmation email to:', customerInfo.email);
    
    const mailOptions = {
        from: {
            name: 'RRB Group',
            address: 'contact@rrbgroup.au'
        },
        to: customerInfo.email,
        subject: 'Virtual Office Payment Confirmation - RRB Group',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
                    <img src="https://rrbgroup.au/images/rrb-logo.png" alt="RRB Group Logo" style="max-width: 100px; margin-bottom: 20px; user-select: none; -webkit-user-drag: none;" draggable="false">
                    <h1 style="color: #2c3e50; margin-bottom: 20px;">Thanks for trusting your business with us</h1>
                    
                    <p style="color: #34495e; font-size: 16px;">Dear ${customerInfo.name},</p>
                    
                    <p style="color: #34495e; font-size: 16px;">Your payment has been successfully processed. We're excited to have you on board!</p>
                    
                    <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
                        <h2 style="color: #2c3e50; margin-bottom: 15px;">Order Details:</h2>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Order Reference:</strong></td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;">${paymentInfo.orderRef}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Plan:</strong></td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;">${paymentInfo.plan}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Period:</strong></td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;">${paymentInfo.period}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Amount:</strong></td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;">$${paymentInfo.amount} AUD</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px;"><strong>Payment Method:</strong></td>
                                <td style="padding: 10px;">${paymentInfo.paymentMethod}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <p style="color: #34495e; font-size: 16px;">Next Steps:</p>
                    <ol style="color: #34495e; font-size: 16px;">
                        <li>Our team will review your application</li>
                        <li>You'll receive your virtual office setup details within 24 hours</li>
                        <li>We'll schedule a welcome call to help you get started</li>
                    </ol>
                    
                    <p style="color: #34495e; font-size: 16px;">If you have any questions, please don't hesitate to contact us.</p>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                        <p style="color: #7f8c8d; font-size: 14px;">Best regards,<br>RRB Group Team</p>
                        <p style="color: #7f8c8d; font-size: 14px;">Phone: +61 435 892 805<br>Email: contact@rrbgroup.au</p>
                    </div>
                </div>
            </div>
        `
    };

    try {
        console.log('Sending email with options:', JSON.stringify(mailOptions, null, 2));
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info);
        return info;
    } catch (error) {
        console.error('Email Error:', error);
        throw error; // Re-throw the error to handle it in the calling function
    }
}

// Helper function to handle successful payments
async function handleSuccessfulPayment(paymentIntent) {
    try {
        const payment = await Payment.findOne({
            'stripeInfo.paymentIntentId': paymentIntent.id
        });

        if (payment) {
            payment.paymentInfo.status = 'completed';
            payment.stripeInfo.status = paymentIntent.status;
            payment.updatedAt = new Date();
            await payment.save();

            // Send success notification to customer
            await sendPaymentStatusEmail(payment.customerInfo, {
                status: 'success',
                orderRef: payment.orderRef,
                amount: payment.paymentInfo.amount
            });

            // Send success notification to business owner
            await sendBusinessNotification({
                amount: payment.paymentInfo.amount,
                plan: payment.paymentInfo.plan,
                period: payment.paymentInfo.period,
                paymentMethod: payment.paymentInfo.paymentMethod,
                orderRef: payment.orderRef,
                status: 'completed'
            }, payment.customerInfo);
        }
    } catch (error) {
        console.error('Error handling successful payment:', error);
    }
}

// Helper function to handle failed payments
async function handleFailedPayment(paymentIntent) {
    try {
        const payment = await Payment.findOne({
            'stripeInfo.paymentIntentId': paymentIntent.id
        });

        if (payment) {
            payment.paymentInfo.status = 'failed';
            payment.stripeInfo.status = paymentIntent.status;
            payment.retryCount += 1;
            payment.updatedAt = new Date();
            await payment.save();

            // Send failure notification to customer
            await sendPaymentStatusEmail(payment.customerInfo, {
                status: 'failed',
                orderRef: payment.orderRef,
                amount: payment.paymentInfo.amount
            });

            // Send failure notification to business owner
            await sendBusinessNotification({
                amount: payment.paymentInfo.amount,
                plan: payment.paymentInfo.plan,
                period: payment.paymentInfo.period,
                paymentMethod: payment.paymentInfo.paymentMethod,
                orderRef: payment.orderRef,
                status: 'failed'
            }, payment.customerInfo);

            // Attempt to retry payment if retry count is less than 3
            if (payment.retryCount < 3) {
                await retryPayment(payment);
            }
        }
    } catch (error) {
        console.error('Error handling failed payment:', error);
    }
}

// Helper function to retry failed payments
async function retryPayment(payment) {
    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: payment.paymentInfo.amount * 100,
            currency: payment.paymentInfo.currency,
            customer: payment.stripeInfo.customerId,
            payment_method: payment.stripeInfo.paymentMethodId,
            confirm: true,
            metadata: {
                orderRef: payment.orderRef,
                retryCount: payment.retryCount
            }
        });

        payment.stripeInfo.paymentIntentId = paymentIntent.id;
        payment.stripeInfo.status = paymentIntent.status;
        await payment.save();
    } catch (error) {
        console.error('Error retrying payment:', error);
    }
}

// Helper function to send payment status email
async function sendPaymentStatusEmail(customerInfo, paymentInfo) {
    const mailOptions = {
        from: 'contact@rrbgroup.au',
        to: customerInfo.email,
        subject: paymentInfo.status === 'success' 
            ? 'Payment Successful - RRB Group' 
            : 'Payment Failed - RRB Group',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
                    <h1 style="color: #2c3e50;">
                        ${paymentInfo.status === 'success' ? 'Payment Successful!' : 'Payment Failed'}
                    </h1>
                    
                    <p style="color: #34495e; font-size: 16px;">Dear ${customerInfo.name},</p>
                    
                    <p style="color: #34495e; font-size: 16px;">
                        ${paymentInfo.status === 'success' 
                            ? 'Your payment has been successfully processed.' 
                            : 'We were unable to process your payment.'}
                    </p>
                    
                    <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
                        <p><strong>Order Reference:</strong> ${paymentInfo.orderRef}</p>
                        <p><strong>Amount:</strong> $${paymentInfo.amount} AUD</p>
                    </div>
                    
                    ${paymentInfo.status === 'failed' ? `
                        <p style="color: #e74c3c;">We will automatically attempt to process your payment again.</p>
                        <p>If you continue to experience issues, please contact our support team.</p>
                    ` : ''}
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                        <p style="color: #7f8c8d;">Best regards,<br>RRB Group Team</p>
                    </div>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Email Error:', error);
    }
}

// Helper function to send business notification
async function sendBusinessNotification(paymentInfo, customerInfo) {
    console.log('Attempting to send business notification to:', BUSINESS_EMAIL);
    
    const mailOptions = {
        from: {
            name: 'RRB Group',
            address: 'contact@rrbgroup.au'
        },
        to: BUSINESS_EMAIL,
        subject: `New Payment Received - ${paymentInfo.orderRef}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
                    <img src="https://rrbgroup.au/images/rrb-logo.png" alt="RRB Group Logo" style="max-width: 100px; margin-bottom: 20px; user-select: none; -webkit-user-drag: none;" draggable="false">
                    <h1 style="color: #2c3e50;">New Payment Received</h1>
                    
                    <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
                        <h2 style="color: #2c3e50; margin-bottom: 15px;">Payment Details:</h2>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Order Reference:</strong></td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;">${paymentInfo.orderRef}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Amount:</strong></td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;">$${paymentInfo.amount} AUD</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Plan:</strong></td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;">${paymentInfo.plan}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Period:</strong></td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;">${paymentInfo.period}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Payment Method:</strong></td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;">${paymentInfo.paymentMethod}</td>
                            </tr>
                        </table>
                    </div>

                    <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
                        <h2 style="color: #2c3e50; margin-bottom: 15px;">Customer Details:</h2>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Name:</strong></td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;">${customerInfo.name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Email:</strong></td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;">${customerInfo.email}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Company:</strong></td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;">${customerInfo.company}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px;"><strong>ABN:</strong></td>
                                <td style="padding: 10px;">${customerInfo.abn || 'Not provided'}</td>
                            </tr>
                        </table>
                    </div>

                    <div style="margin-top: 20px; padding: 15px; background-color: #e8f5e9; border-radius: 5px;">
                        <p style="margin: 0; color: #2e7d32;">
                            <strong>Action Required:</strong> Please process this order and set up the virtual office for the customer.
                        </p>
                    </div>

                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                        <p style="color: #7f8c8d; font-size: 14px;">Best regards,<br>RRB Group Team</p>
                        <p style="color: #7f8c8d; font-size: 14px;">Phone: +61 435 892 805<br>Email: contact@rrbgroup.au</p>
                    </div>
                </div>
            </div>
        `
    };

    try {
        console.log('Sending business notification with options:', JSON.stringify(mailOptions, null, 2));
        const info = await transporter.sendMail(mailOptions);
        console.log('Business notification sent successfully:', info);
        return info;
    } catch (error) {
        console.error('Business Notification Email Error:', error);
        throw error; // Re-throw the error to handle it in the calling function
    }
}

// Test endpoint for email configuration
app.get('/api/test-email', async (req, res) => {
    try {
        // Test business notification
        await sendBusinessNotification({
            amount: 100,
            plan: 'Professional',
            period: '12 Months',
            paymentMethod: 'Credit Card',
            orderRef: 'TEST-123',
            status: 'test'
        }, {
            name: 'Bryan Rodriguez',
            email: 'brayan31073@gmail.com',
            company: 'RRB Group',
            abn: '12345678901'
        });

        // Test customer confirmation
        await sendConfirmationEmail({
            name: 'Bryan Rodriguez',
            email: 'brayan31073@gmail.com',
            company: 'RRB Group',
            abn: '12345678901'
        }, {
            amount: 100,
            plan: 'Professional',
            period: '12 Months',
            paymentMethod: 'Credit Card',
            orderRef: 'TEST-123'
        });

        res.json({ 
            success: true, 
            message: 'Test emails sent successfully. Please check brayan31073@gmail.com for the test emails.' 
        });
    } catch (error) {
        console.error('Email Test Error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            details: 'Please check the server logs for more information.'
        });
    }
});

// Get all clients
app.get('/api/admin/clients', authenticateAdmin, async (req, res) => {
    try {
        const clients = await Client.find().sort({ createdAt: -1 });
        const formattedClients = clients.map(client => {
            const c = client.toObject();
            c.joiningDate = c.joiningDate ? new Date(c.joiningDate).toISOString().slice(0, 10).replace(/-/g, '/') : '';
            c.paymentEffectiveUntil = c.paymentEffectiveUntil ? new Date(c.paymentEffectiveUntil).toISOString().slice(0, 10).replace(/-/g, '/') : '';
            if (!c.active) c.active = 'Y';
            return c;
        });
        res.json({ success: true, clients: formattedClients });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Export clients (MUST come before /api/admin/clients/:id)
app.get('/api/admin/clients/export', authenticateAdmin, async (req, res) => {
    console.log('--- /api/admin/clients/export endpoint called ---');
    try {
        const clients = await Client.find({}).sort({ serial: 1 });
        console.log('Exporting clients, found:', clients.length);
        if (clients.length > 0) {
            console.log('First client record:', JSON.stringify(clients[0], null, 2));
        }
        // Convert to CSV
        const headers = ['Serial', 'Rep Name', 'Company', 'Phone', 'Email', 'Country', 'State', 'Joining Date', 'Active', 'Payment Effective Until'];
        const csvRows = [headers];
        clients.forEach(client => {
            // Safely stringify each field, handle null/undefined, and escape commas/newlines
            function safe(val) {
                if (val === null || val === undefined) return '';
                let str = String(val);
                if (str.includes(',') || str.includes('\n') || str.includes('"')) {
                    str = '"' + str.replace(/"/g, '""') + '"';
                }
                return str;
            }
            csvRows.push([
                safe(client.serial),
                safe(client.repName),
                safe(client.companyName),
                safe(client.phone),
                safe(client.email),
                safe(client.country),
                safe(client.state),
                client.joiningDate ? safe(new Date(client.joiningDate).toISOString().split('T')[0]) : '',
                safe(client.active),
                client.paymentEffectiveUntil ? safe(new Date(client.paymentEffectiveUntil).toISOString().split('T')[0]) : ''
            ]);
        });
        const csvContent = csvRows.map(row => row.join(',')).join('\n');
        console.log('--- Sending CSV response ---');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=clients.csv');
        res.send(csvContent);
    } catch (error) {
        console.log('--- Export error about to be sent to client ---');
        console.error('Export error:', error);
        if (error.stack) console.error(error.stack);
        res.status(500).json({ success: false, message: 'Error exporting data', error: error.message, stack: error.stack });
    }
});

// Get single client (MUST come after /api/admin/clients/export)
app.get('/api/admin/clients/:id', authenticateAdmin, async (req, res) => {
    try {
        const client = await Client.findById(req.params.id);
        if (!client) {
            return res.status(404).json({ success: false, message: 'Client not found' });
        }
        res.json({ success: true, client });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create client
app.post('/api/admin/clients', authenticateAdmin, upload.any(), async (req, res) => {
    try {
        // Auto-increment serial
        const lastClient = await Client.findOne({ serial: { $exists: true } }).sort({ serial: -1 });
        const serial = (lastClient && typeof lastClient.serial === 'number') ? lastClient.serial + 1 : 1;
        const clientData = { ...req.body, serial };

        // Handle file uploads
        if (req.files && req.files.length > 0) {
            clientData.documents = req.files.map(file => ({
                filename: file.originalname,
                path: file.path,
                uploadDate: new Date()
            }));
        }

        // Add initial change history entry
        clientData.history = [{
            timestamp: new Date(),
            changedBy: req.admin?.username || 'admin',
            changes: [{
                field: 'creation',
                oldValue: null,
                newValue: 'Client created'
            }]
        }];

        if (req.body.paymentEffectiveUntil) {
            clientData.paymentEffectiveUntil = new Date(req.body.paymentEffectiveUntil);
        }

        const client = new Client(clientData);
        await client.save();
        await sendWelcomeEmail(client);
        res.json({ success: true, client });
    } catch (error) {
        console.error('Error creating client:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Add endpoint to add a new history note
app.post('/api/admin/clients/:id/history', authenticateAdmin, async (req, res) => {
    try {
        const client = await Client.findById(req.params.id);
        if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
        
        const { note } = req.body;
        if (!note) return res.status(400).json({ success: false, message: 'Note is required' });

        // Add new history entry with note
        client.history.push({
            timestamp: new Date(),
            changedBy: req.admin?.username || 'admin',
            changes: [{
                field: 'note',
                oldValue: null,
                newValue: 'Note added'
            }],
            note: note
        });

        await client.save();
        res.json({ success: true, history: client.history[client.history.length - 1] });
    } catch (error) {
        console.error('Error adding history note:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Update client
app.put('/api/admin/clients/:id', authenticateAdmin, upload.any(), async (req, res) => {
    try {
        const client = await Client.findById(req.params.id);
        if (!client) {
            return res.status(404).json({ success: false, message: 'Client not found' });
        }

        const clientData = { ...req.body };
        console.log('Update client req.body:', clientData);
        console.log('Update client req.files:', req.files);

        // Handle file uploads
        if (req.files && req.files.length > 0) {
            const newDocs = req.files.map(file => ({
                filename: file.originalname,
                path: file.path,
                uploadDate: new Date()
            }));
            
            // Filter out duplicates
            const existingFilenames = new Set((client.documents || []).map(doc => doc.filename));
            const uniqueNewDocs = newDocs.filter(doc => !existingFilenames.has(doc.filename));
            
            // Append new documents
            client.documents = [...(client.documents || []), ...uniqueNewDocs];

            // Add history entry for file upload
            client.history.push({
                timestamp: new Date(),
                changedBy: req.admin?.username || 'admin',
                changes: [{
                    field: 'documents',
                    oldValue: null,
                    newValue: `Added ${uniqueNewDocs.length} new document(s)`
                }]
            });
        }

        // Track changes
        const changes = [];
        Object.keys(clientData).forEach(field => {
            if (field !== 'documents' && client[field] != clientData[field]) {
                changes.push({
                    field,
                    oldValue: client[field],
                    newValue: clientData[field]
                });
            }
        });

        if (changes.length > 0) {
            client.history.push({
                timestamp: new Date(),
                changedBy: req.admin?.username || 'admin',
                changes
            });
        }

        if (clientData.paymentEffectiveUntil) {
            clientData.paymentEffectiveUntil = new Date(clientData.paymentEffectiveUntil);
        }

        if (client.paymentEffectiveUntil?.toISOString().slice(0,10) !== clientData.paymentEffectiveUntil?.toISOString().slice(0,10)) {
            changes.push({
                field: 'paymentEffectiveUntil',
                oldValue: client.paymentEffectiveUntil,
                newValue: clientData.paymentEffectiveUntil
            });
        }

        // Update client fields
        Object.assign(client, clientData);
        client.updatedAt = new Date();
        
        await client.save();
        console.log('Updated client:', client);
        res.json({ success: true, client });
    } catch (error) {
        console.error('Error updating client:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Delete client
app.delete('/api/admin/clients/:id', authenticateAdmin, async (req, res) => {
    try {
        const client = await Client.findByIdAndDelete(req.params.id);
        if (!client) {
            return res.status(404).json({ success: false, message: 'Client not found' });
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Helper function to send welcome email
async function sendWelcomeEmail(client) {
    const mailOptions = {
        from: {
            name: 'RRB Group',
            address: 'contact@rrbgroup.au'
        },
        to: client.email,
        subject: 'Welcome to RRB Group',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
                    <img src="https://rrbgroup.au/images/rrb-logo.png" alt="RRB Group Logo" style="max-width: 100px; margin-bottom: 20px; user-select: none; -webkit-user-drag: none;" draggable="false">
                    <h1 style="color: #2c3e50; margin-bottom: 20px;">Welcome to RRB Group</h1>
                    
                    <p style="color: #34495e; font-size: 16px;">Dear ${client.repName},</p>
                    
                    <p style="color: #34495e; font-size: 16px;">Thank you for choosing RRB Group. We're excited to have you on board!</p>
                    
                    <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
                        <h2 style="color: #2c3e50; margin-bottom: 15px;">Your Account Details:</h2>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Company:</strong></td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;">${client.companyName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>ABN:</strong></td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;">${client.abn}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px;"><strong>Joining Date:</strong></td>
                                <td style="padding: 10px;">${new Date(client.joiningDate).toLocaleDateString()}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <p style="color: #34495e; font-size: 16px;">If you have any questions, please don't hesitate to contact us.</p>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                        <p style="color: #7f8c8d; font-size: 14px;">Best regards,<br>RRB Group Team</p>
                        <p style="color: #7f8c8d; font-size: 14px;">Phone: +61 435 892 805<br>Email: contact@rrbgroup.au</p>
                    </div>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Welcome Email Error:', error);
    }
}

// Error handling for static files
app.use((req, res, next) => {
    if (req.path.startsWith('/admin/')) {
        return res.status(404).send('Admin page not found.');
    }
    next();
});

// Global error handler (should be last middleware)
app.use((err, req, res, next) => {
    console.error('UNHANDLED ERROR:', err);
    res.status(500).json({ success: false, message: 'Internal server error', error: err.message, stack: err.stack });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Test the email configuration by visiting: http://localhost:${PORT}/api/test-email`);
}); 