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
    const hashedPassword = await bcrypt.hash(password, 10);

    // Saving user
    console.log("User is registered:", {username, email, phone, hashedPassword});

    return res.status(201).json({message: 'User registered successfully!'});


});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
})