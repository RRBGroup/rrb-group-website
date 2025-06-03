const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/rrb-group', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
});

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
    state: { type: String, required: true },
    optional1: String,
    optional2: String,
    documents: [{
        filename: String,
        path: String,
        uploadDate: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Client = mongoose.model('Client', clientSchema);

async function addSerialNumbers() {
    try {
        // Get all clients without serial numbers
        const clients = await Client.find({ serial: { $exists: false } }).sort({ createdAt: 1 });
        console.log(`Found ${clients.length} clients without serial numbers`);

        // Add serial numbers
        let serial = 1;
        for (const client of clients) {
            client.serial = serial++;
            await client.save();
            console.log(`Added serial ${client.serial} to client ${client.companyName}`);
        }

        console.log('Successfully added serial numbers to all clients');
    } catch (error) {
        console.error('Error adding serial numbers:', error);
    } finally {
        mongoose.connection.close();
    }
}

// Run the script
addSerialNumbers(); 