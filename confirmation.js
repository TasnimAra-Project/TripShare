$(document).ready(function() {
    // Get user data from localStorage
    const userData = JSON.parse(localStorage.getItem('userData'));
    
    if (userData) {
        // Display user information
        $('#username').text(userData.username);
        $('#email').text(userData.email);
    } else {
        // If no user data, redirect to registration page
        window.location.href = 'register.html';
    }
    
    // Handle "Go Back to Login Page" button
    $('#goToLogin').on('click', function() {
        // Clear the stored user data
        localStorage.removeItem('userData');
        // Redirect to login page
        window.location.href = 'Login.html';
    });
});