// Initialize variables
let currentStep = 1;
let stripe;
let card;
let cardForm;
let bankForm;

// Initialize Stripe
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Stripe with test publishable key
    stripe = Stripe('pk_live_51RR9QRIot8yyc8YFJXoeyE4LnS8v6AdAHUmSyfYNyRPXacZ8j31XCm6NN8G3WJIFGgVGxzXJ7qTvPaSl4qY22CNT00ONGXP02j');
    
    const elements = stripe.elements();

    // Create card Element
    card = elements.create('card', {
        style: {
            base: {
                fontSize: '16px',
                color: '#32325d',
                fontFamily: '"Poppins", sans-serif',
                '::placeholder': {
                    color: '#aab7c4'
                }
            },
            invalid: {
                color: '#dc3545',
                iconColor: '#dc3545'
            }
        }
    });

    // Mount the card Element
    card.mount('#card-element');

    // Handle real-time validation errors
    card.addEventListener('change', function(event) {
        const displayError = document.getElementById('card-errors');
        if (event.error) {
            displayError.textContent = event.error.message;
            displayError.classList.add('show');
        } else {
            displayError.textContent = '';
            displayError.classList.remove('show');
        }
    });

    // Get form elements
    cardForm = document.getElementById('card-payment-form');
    bankForm = document.getElementById('bank-payment-form');

    // Add payment method selection handlers
    const paymentMethods = document.querySelectorAll('.payment-method');
    paymentMethods.forEach(method => {
        method.addEventListener('click', function() {
            // Remove selected class from all methods
            paymentMethods.forEach(m => m.classList.remove('selected'));
            
            // Add selected class to clicked method
            this.classList.add('selected');
            
            // Show/hide appropriate form
            const methodType = this.dataset.method;
            if (methodType === 'card') {
                cardForm.classList.add('active');
                bankForm.classList.remove('active');
            } else if (methodType === 'bank') {
                cardForm.classList.remove('active');
                bankForm.classList.add('active');
            }
            
            // Update total amount display based on payment method
            updatePlanSummary();
        });
    });

    // Handle form submission
    if (cardForm) {
        cardForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            
            const submitButton = document.getElementById('submit-payment');
            submitButton.disabled = true;
            submitButton.textContent = 'Processing...';

            try {
                // Create payment method
                const { paymentMethod, error } = await stripe.createPaymentMethod({
                    type: 'card',
                    card: card,
                });

                if (error) {
                    throw error;
                }

                // Get customer info from step 1 and 2
                const customerInfo = {
                    name: `${document.getElementById('first-name').value} ${document.getElementById('last-name').value}`,
                    email: document.getElementById('email').value,
                    company: document.getElementById('company-name').value,
                    abn: document.getElementById('abn').value,
                    phone: document.getElementById('phone').value,
                    address: {
                        city: document.getElementById('city').value,
                        state: document.getElementById('state').value,
                        country: document.getElementById('country').value,
                        postcode: document.getElementById('postcode').value
                    }
                };

                // Get plan details
                const plan = document.getElementById('plan-select').value;
                const period = document.getElementById('period-select').value;
                const location = document.getElementById('location-select').value;
                const amount = parseFloat(document.getElementById('base-amount').textContent.replace('$', ''));

                // Send payment to server
                const response = await fetch('/api/process-payment', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        paymentMethodId: paymentMethod.id,
                        amount,
                        customerInfo,
                        plan,
                        period,
                        location
                    })
                });

                const result = await response.json();

                if (!result.success) {
                    throw new Error(result.error || 'Payment failed');
                }

                // Show success message
                const successMessage = document.createElement('div');
                successMessage.className = 'success-message';
                successMessage.innerHTML = `
                    <i class="fas fa-check-circle"></i>
                    <h3>Payment Successful!</h3>
                    <p>We'll send you a confirmation email shortly.</p>
                    <p>You can close this window now. If you want to go back to our website, click on the relevant section at the top of the page.</p>
                    <p style="color: #666; font-size: 14px; margin-top: 20px;">Note: If this is your first transaction with us, please check your spam folder for the confirmation email.</p>
                `;
                
                // Replace form with success message
                cardForm.innerHTML = '';
                cardForm.appendChild(successMessage);

                // Set order reference in step 4
                document.getElementById('order-reference').textContent = result.orderRef;

                // Show step 4 (Confirmation)
                showStep(4);

                // Update progress bar to show confirmation step
                const progressSteps = document.querySelectorAll('.progress-step');
                progressSteps.forEach((step, index) => {
                    if (index === 3) { // Step 4 (Confirmation)
                        step.classList.add('active');
                        step.classList.add('completed');
                    } else {
                        step.classList.remove('active');
                        if (index < 3) {
                            step.classList.add('completed');
                        }
                    }
                });

                // Update progress bar
                const progressBar = document.querySelector('.progress-bar');
                progressBar.style.width = '100%';

            } catch (error) {
                const errorElement = document.getElementById('card-errors');
                errorElement.textContent = error.message;
                errorElement.classList.add('show');
                submitButton.disabled = false;
                submitButton.textContent = 'Complete Payment';
            }
        });
    }

    // Initialize form navigation
    initializeFormNavigation();
    
    // Initial update of plan summary
    updatePlanSummary();
});

// Form navigation functions
function initializeFormNavigation() {
    // Set initial step
    showStep(currentStep);

    // Add input event listeners
    document.querySelectorAll('input[required], select[required]').forEach(input => {
        input.addEventListener('input', function() {
            if (this.value.trim()) {
                this.classList.remove('error');
                const errorMessage = this.parentElement.querySelector('.error-message');
                if (errorMessage) {
                    errorMessage.classList.remove('show');
                }
            }
        });
    });
}

function validateAndProceed(step) {
    if (validateStep(step)) {
        // Hide all steps
        document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
        
        // Show next step
        document.querySelector(`.form-step[data-step="${step + 1}"]`).classList.add('active');
        
        // If moving to payment step (step 3), initialize payment method
        if (step === 2) {
            // Ensure credit card is selected by default
            const paymentMethods = document.querySelectorAll('.payment-method');
            paymentMethods.forEach(method => method.classList.remove('selected'));
            const creditCardMethod = document.querySelector('.payment-method[data-method="card"]');
            if (creditCardMethod) {
                creditCardMethod.classList.add('selected');
            }
            
            // Show credit card form by default
            const cardForm = document.getElementById('card-payment-form');
            const bankForm = document.getElementById('bank-payment-form');
            if (cardForm && bankForm) {
                cardForm.classList.add('active');
                bankForm.classList.remove('active');
            }
            
            // Update the summary with selected values
            const plan = document.getElementById('plan-select').value;
            const period = document.getElementById('period-select').value;
            const location = document.getElementById('location-select').value;
            
            document.getElementById('summary-plan').textContent = plan;
            document.getElementById('summary-period').textContent = period;
            document.getElementById('summary-location').textContent = location;
            
            // Update amounts with surcharge since credit card is default
            updatePlanSummary();
        }
        
        // Update current step
        currentStep = step + 1;
    }
}

function goToStep(step) {
    currentStep = step;
    showStep(step);
}

function showStep(step) {
    // Hide all form steps
    document.querySelectorAll('.form-step').forEach(formStep => {
        formStep.classList.remove('active');
    });

    // Show the current step
    const currentFormStep = document.querySelector(`.form-step[data-step="${step}"]`);
    if (currentFormStep) {
        currentFormStep.classList.add('active');
    }

    // Update progress bar
    document.querySelectorAll('.step').forEach(progressStep => {
        const stepNum = parseInt(progressStep.dataset.step);
        progressStep.classList.remove('active', 'completed');
        if (stepNum === step) {
            progressStep.classList.add('active');
        } else if (stepNum < step) {
            progressStep.classList.add('completed');
        }
    });
}

function validateStep(step) {
    const currentFormStep = document.querySelector(`.form-step[data-step="${step}"]`);
    const inputs = currentFormStep.querySelectorAll('input[required], select[required]');
    let isValid = true;
    let errorMessages = [];

    // Remove any existing validation summary
    const existingSummary = currentFormStep.querySelector('.validation-summary');
    if (existingSummary) {
        existingSummary.remove();
    }

    // Remove error states from all inputs
    inputs.forEach(input => {
        input.classList.remove('error');
        const errorMessage = input.parentElement.querySelector('.error-message');
        if (errorMessage) {
            errorMessage.classList.remove('show');
        }
    });

    // Validate each input
    inputs.forEach(input => {
        if (!input.value.trim()) {
            isValid = false;
            input.classList.add('error');
            
            // Create or show error message
            let errorMessage = input.parentElement.querySelector('.error-message');
            if (!errorMessage) {
                errorMessage = document.createElement('div');
                errorMessage.className = 'error-message';
                input.parentElement.appendChild(errorMessage);
            }
            errorMessage.textContent = `${input.previousElementSibling.textContent.replace(' *', '')} is required`;
            errorMessage.classList.add('show');
            
            errorMessages.push(input.previousElementSibling.textContent.replace(' *', ''));
        }
    });

    // If there are errors, show validation summary
    if (!isValid) {
        const validationSummary = document.createElement('div');
        validationSummary.className = 'validation-summary';
        validationSummary.innerHTML = `
            <h4>Please complete all required fields:</h4>
            <ul>
                ${errorMessages.map(field => `<li>${field}</li>`).join('')}
            </ul>
        `;
        currentFormStep.insertBefore(validationSummary, currentFormStep.firstChild);
        validationSummary.classList.add('show');
    }

    return isValid;
}

// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const initialPlan = urlParams.get('plan') || 'Professional';
const initialPeriod = urlParams.get('period') || '12 Months';

// Set initial plan and period
document.getElementById('plan-select').value = initialPlan;
document.getElementById('period-select').value = initialPeriod;
updatePlanSummary(); // Ensure correct total on load

// Always update summary when plan or period changes
document.getElementById('plan-select').addEventListener('change', updatePlanSummary);
document.getElementById('period-select').addEventListener('change', updatePlanSummary);

// Update plan summary
function updatePlanSummary() {
    const plan = document.getElementById('plan-select').value;
    const period = document.getElementById('period-select').value;
    const location = document.getElementById('location-select').value;
    
    // Update summary display
    document.getElementById('summary-plan').textContent = plan;
    document.getElementById('summary-period').textContent = period;
    document.getElementById('summary-location').textContent = location;
    
    // Calculate base amount
    let baseAmount = 0;
    switch(plan) {
        case 'Professional':
            switch(period) {
                case '12 Months':
                    baseAmount = 65;
                    break;
                case '6 Months':
                    baseAmount = 80;
                    break;
                case '1 Month':
                    baseAmount = 100;
                    break;
            }
            break;
        case 'Basic':
            switch(period) {
                case '12 Months':
                    baseAmount = 45.50;
                    break;
                case '6 Months':
                    baseAmount = 56;
                    break;
                case '1 Month':
                    baseAmount = 70;
                    break;
            }
            break;
    }
    
    // Calculate total for the period
    let totalForPeriod = 0;
    switch(period) {
        case '12 Months':
            totalForPeriod = baseAmount * 12;
            break;
        case '6 Months':
            totalForPeriod = baseAmount * 6;
            break;
        case '1 Month':
            totalForPeriod = baseAmount;
            break;
    }
    
    // Update all amount displays
    const formatAmount = (amount) => amount.toFixed(2);
    
    // Update base amount in payment summary (step 3)
    const baseAmountElement = document.getElementById('base-amount');
    if (baseAmountElement) {
        baseAmountElement.textContent = formatAmount(totalForPeriod) + ' AUD';
    }
    
    // Calculate total with surcharge (only for credit card payments in step 3)
    const surcharge = 0.025;
    const totalAmount = totalForPeriod * (1 + surcharge);
    
    // Update total amount in payment summary (step 3)
    const totalAmountElements = document.querySelectorAll('#total-amount');
    totalAmountElements.forEach(element => {
        // Only apply surcharge if we're in step 3 and credit card is selected
        const isStep3 = document.querySelector('.form-step[data-step="3"]').classList.contains('active');
        const isBankTransfer = document.querySelector('.payment-method.selected')?.dataset.method === 'bank';
        
        if (isStep3) {
            // In step 3, show surcharge by default (credit card) unless bank transfer is explicitly selected
            if (isBankTransfer) {
                element.textContent = formatAmount(totalForPeriod) + ' AUD';
            } else {
                element.textContent = formatAmount(totalAmount) + ' AUD';
            }
        } else {
            // In other steps, show base amount without surcharge
            element.textContent = formatAmount(totalForPeriod) + ' AUD';
        }
    });
    
    // Update bank transfer amount (always without surcharge)
    const bankTransferAmount = document.getElementById('bank-transfer-amount');
    if (bankTransferAmount) {
        bankTransferAmount.textContent = formatAmount(totalForPeriod) + ' AUD';
    }
    
    // Store the amounts for payment processing
    window.totalAmount = totalAmount;
    window.baseAmount = totalForPeriod;
}

// Handle bank transfer form submission
document.getElementById('bank-payment-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const submitButton = document.getElementById('submit-bank');
    submitButton.disabled = true;
    submitButton.textContent = 'Processing...';

    try {
        // Get customer info
        const customerInfo = {
            name: `${document.getElementById('first-name').value} ${document.getElementById('last-name').value}`,
            email: document.getElementById('email').value,
            company: document.getElementById('company-name').value,
            abn: document.getElementById('abn').value
        };

        // Generate order reference
        const orderRef = 'VO-' + Math.random().toString(36).substr(2, 9).toUpperCase();

        // Process bank transfer
        const response = await fetch('/api/process-bank-transfer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                orderRef: orderRef,
                amount: window.totalAmount,
                customerInfo: customerInfo,
                plan: document.getElementById('plan-select').value,
                period: document.getElementById('period-select').value
            })
        });

        // Check if response is ok and has content
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Server response:', errorText);
            throw new Error(`Server responded with status: ${response.status}. ${errorText}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Server response was not JSON');
        }

        const result = await response.json();

        if (result.success) {
            // Show success message
            document.getElementById('order-reference').textContent = result.orderRef;
            currentStep = 4;
            showStep(currentStep);
        } else {
            throw new Error(result.error || 'Bank transfer processing failed');
        }
    } catch (error) {
        console.error('Bank Transfer Error:', error);
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message show';
        errorElement.textContent = error.message || 'An error occurred while processing your bank transfer. Please try again.';
        
        const bankForm = document.getElementById('bank-payment-form');
        const existingError = bankForm.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
        bankForm.insertBefore(errorElement, bankForm.firstChild);
        
        submitButton.disabled = false;
        submitButton.textContent = 'Confirm Bank Details';
    }
});

// Add global error handler
window.onerror = function(message, source, lineno, colno, error) {
    console.error('Global error:', message, source, lineno, colno, error);
    alert('A script error occurred: ' + message);
}; 