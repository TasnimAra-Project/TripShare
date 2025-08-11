const db = require('./db');
const express = require('express');
const cors = require('cors');
const bodyParser = require ('body-parser');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 8000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Test Route
app.get('/', (req, res) => {
    res.send('Backend server is running');
});

// Registration route 
app.post('/api/register', async (req, res) => {
    const {username, password, confirmPassword, email, phone} = req.body;

    // Basic Validation
    if(!username || !password || !confirmPassword || !email || !phone) {
        return res.status(400).json({message: 'All fields are required!'});
    }

    if(password !== confirmPassword) {
        return res.status(400).json({message: 'Passwords do not match, Try Again!'});
    }

    // Hash Password
    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert into the Database
        const insertQuery = 'INSERT INTO users (username, email, phone, password) VALUES (?, ?, ?, ?)';
        const values = [username, email, phone, hashedPassword];

        db.query(insertQuery, values, (err, results) => {
            if (err) {
                console.error ('Error inserting user:', err);
                return res.status(500).json({message: 'Database error'});
            }

            // Send back user info (excluding the password)
            const newUser = {
                 id: results.insertId,
                 username,
                 email,
                 phone
            };
            return res.status(201).json({message: 'User registered successfully!', user: newUser});
        });
    } catch (error) {
        console.error('Error in registration:', error);
        return res.status(500).json({message: 'Internal server error'});
    }

});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
})