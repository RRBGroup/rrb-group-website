const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect('mongodb://localhost:27017/rrb-group', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const clientSchema = new mongoose.Schema({}, { strict: false });
const Client = mongoose.model('Client', clientSchema, 'clients');

async function prefillActiveField() {
    try {
        const result = await Client.updateMany(
            { $or: [ { active: { $exists: false } }, { active: null } ] },
            { $set: { active: 'Y' } }
        );
        console.log(`Updated ${result.nModified || result.modifiedCount} clients to have active: 'Y'`);
    } catch (error) {
        console.error('Error updating clients:', error);
    } finally {
        mongoose.connection.close();
    }
}

prefillActiveField(); 