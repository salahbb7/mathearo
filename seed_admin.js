const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function run() {
    await mongoose.connect('mongodb://localhost:27017/math-heroes');
    const db = mongoose.connection.db;
    const teachers = db.collection('teachers');
    const existing = await teachers.findOne({ email: 'superadmin@school.com' });
    if (!existing) {
        const password = await bcrypt.hash('admin123', 10);
        await teachers.insertOne({
            email: 'superadmin@school.com',
            password: password,
            name: 'المدير العام',
            role: 'superadmin',
            createdAt: new Date(),
            updatedAt: new Date()
        });
        console.log("Super admin created successfully.");
    } else {
        console.log("Super admin already exists.");
    }
    await mongoose.disconnect();
}
run();
