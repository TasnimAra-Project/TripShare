const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost', 
    user: 'root',
    password: 'America2629@',
    database: 'tripshare'
});

connection.connect((err) => {
    if(err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL databse!');
});

module.exports = connection;