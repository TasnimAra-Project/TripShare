const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('./db');

// Configure multer storage for image uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Ensure this folder exists
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// Handle both text and file fields
router.post(
    '/',
    upload.fields([{ name: 'image', maxCount: 1 }]),
    (req, res) => {
        console.log("REQ BODY:", req.body);
        console.log("REQ FILES:", req.files);

        const {
            user_id,
            placeName,
            address,
            city,
            state,
            country,
            postalCode,
            lat,
            lng,
            safety,
            affordability,
            description
        } = req.body;

        // Validate required fields
        if (!user_id || !placeName || !address || !city || !state || !country || !safety || !affordability || !description) {
            return res.status(400).json({ success: false, message: 'Missing required fields.' });
        }

        // Prepare image path if file uploaded
        const imagePath = req.files && req.files.image ? `/uploads/${req.files.image[0].filename}` : null;

        // SQL insert
        const sql = `
            INSERT INTO posts
            (user_id, place_name, address, city, state, country, postal_code, latitude, longitude, safety_rating, affordability_rating, description, image_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            user_id,
            placeName,
            address,
            city,
            state,
            country,
            postalCode || null,
            lat ? parseFloat(lat) : null,
            lng ? parseFloat(lng) : null,
            parseInt(safety),
            parseInt(affordability),
            description,
            imagePath
        ];

        console.log("Attempting to insert into DB:", values);

        db.query(sql, values, (err, result) => {
            if (err) {
                console.error('DB Insert Error:', err);
                return res.status(500).json({ success: false, message: 'Database error' });
            }

            console.log(`Post inserted with ID: ${result.insertId}`);

            // Fetch the inserted row to confirm what MySQL stored
            db.query('SELECT * FROM posts WHERE post_id = ?', [result.insertId], (err2, rows) => {
                if (err2) {
                    console.error('DB Fetch Error:', err2);
                    return res.status(500).json({ success: false, message: 'Database fetch error' });
                }

                console.log("Inserted Row from DB:", rows[0]); // This shows in backend console

                res.json({
                    success: true,
                    postId: result.insertId,
                    post: rows[0] // Also sends to frontend if you want to see it there
                });
            });
        });
    }
);

module.exports = router;
