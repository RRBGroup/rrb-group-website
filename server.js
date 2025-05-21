const express = require('express');
const stripe = require('stripe')('YOUR_STRIPE_SECRET_KEY');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/rrb-group', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Define Payment Schema
const paymentSchema = new mongoose.Schema({
    orderRef: String,
    customerInfo: {
        name: String,
        email: String,
        company: String,
        abn: String
    },
    paymentInfo: {
        amount: Number,
        currency: String,
        plan: String,
        period: String,
        paymentMethod: String,
        status: String
    },
    stripeInfo: {
        customerId: String,
        paymentIntentId: String,
        status: String
    },
    retryCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Payment = mongoose.model('Payment', paymentSchema);

// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'brayan31073@gmail.com',
        pass: 'qyap prpc awdl tzgs'
    }
});

// Business owner email
const BUSINESS_EMAIL = 'contact@rrbgroup.au';

// Stripe webhook secret
const webhookSecret = 'YOUR_STRIPE_WEBHOOK_SECRET';

// Process Stripe payment
app.post('/api/process-payment', async (req, res) => {
    try {
        const { paymentMethodId, amount, customerInfo, plan, period } = req.body;
        const orderRef = `VO-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

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
            amount: amount * 100, // Convert to cents
            currency: 'aud',
            payment_method: paymentMethodId,
            customer: customer.id,
            confirm: true,
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
                amount,
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
            amount,
            plan,
            period,
            paymentMethod: 'Credit Card',
            orderRef
        });

        // Send notification to business owner
        await sendBusinessNotification({
            amount,
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
    const mailOptions = {
        from: 'YOUR_EMAIL@gmail.com',
        to: customerInfo.email,
        subject: 'Virtual Office Payment Confirmation - RRB Group',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
                    <img src="YOUR_LOGO_URL" alt="RRB Group Logo" style="max-width: 200px; margin-bottom: 20px;">
                    <h1 style="color: #2c3e50; margin-bottom: 20px;">Thank you for your payment!</h1>
                    
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
                        <p style="color: #7f8c8d; font-size: 14px;">Phone: YOUR_PHONE<br>Email: YOUR_EMAIL</p>
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
        from: 'YOUR_EMAIL@gmail.com',
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

// Helper function to send business owner notification
async function sendBusinessNotification(paymentInfo, customerInfo) {
    const mailOptions = {
        from: 'YOUR_EMAIL@gmail.com',
        to: BUSINESS_EMAIL,
        subject: `New Payment Received - ${paymentInfo.orderRef}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
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
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Business Notification Email Error:', error);
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
            name: 'Test Customer',
            email: 'test@example.com',
            company: 'Test Company',
            abn: '12345678901'
        });

        // Test customer confirmation
        await sendConfirmationEmail({
            name: 'Test Customer',
            email: 'test@example.com',
            company: 'Test Company',
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
            message: 'Test emails sent successfully. Please check both contact@rrbgroup.au and test@example.com for the test emails.' 
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

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Test the email configuration by visiting: http://localhost:${PORT}/api/test-email`);
}); 