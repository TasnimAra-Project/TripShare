$(document).ready(function() {
    // Check if we're running on localhost (server)
    if (window.location.protocol === 'file:') {
        alert('Please access this application through http://localhost:5000 instead of opening the HTML file directly.');
        return;
    }
    
    $('#registerForm').on('submit', function(e) {
        e.preventDefault();
        
        // Get form values
        const username = $('#username').val().trim();
        const password = $('#password').val();
        const confirmPassword = $('#confirmPassword').val();
        const email = $('#email').val().trim();
        const phone = $('#phone').val().trim();
        
        // Validation
        if (!username || !password || !confirmPassword || !email || !phone) {
            showMessage('Please fill in all fields', 'error');
            return;
        }
        
        if (password !== confirmPassword) {
            showMessage('Passwords do not match', 'error');
            return;
        }
        
        if (password.length < 6) {
            showMessage('Password must be at least 6 characters long', 'error');
            return;
        }
        
        if (!isValidEmail(email)) {
            showMessage('Please enter a valid email address', 'error');
            return;
        }
        
        if (!isValidPhone(phone)) {
            showMessage('Please enter a valid phone number', 'error');
            return;
        }
        
        // Show loading state
        $('#createAccount').prop('disabled', true).text('Creating Account...');
        
        // Prepare user data for API
        const userData = {
            username: username,
            email: email,
            phone: phone,
            password: password
        };
        
        // Send registration request to backend
        $.ajax({
            url: '/api/register',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(userData),
            success: function(response) {
                console.log('Registration success:', response);
                if (response.success) {
                    // Store user data for confirmation page
                    localStorage.setItem('userData', JSON.stringify(response.user));
                    showMessage('Account created successfully! Redirecting...', 'success');
                    
                    // Redirect to confirmation page after a short delay
                    setTimeout(function() {
                        window.location.href = 'confirmation.html';
                    }, 1500);
                } else {
                    showMessage(response.message || 'Registration failed', 'error');
                }
            },
            error: function(xhr, status, error) {
                console.error('Registration error:', {xhr, status, error});
                let errorMessage = 'Registration failed. Please try again.';
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMessage = xhr.responseJSON.message;
                }
                showMessage(errorMessage, 'error');
            },
            complete: function() {
                // Reset button state
                $('#createAccount').prop('disabled', false).text('Create Account');
            }
        });
    });
    
    function showMessage(message, type) {
        $('#message').text(message);
        $('#confirmation').removeClass('hidden error');
        if (type === 'error') {
            $('#confirmation').addClass('error');
        }
        
        // Hide message after 3 seconds
        setTimeout(function() {
            $('#confirmation').addClass('hidden');
        }, 3000);
    }
    
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    function isValidPhone(phone) {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
    }
}); 