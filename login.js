// Wait for page to be ready
$(document).ready(function () {

    // Show alert if someone opens the file directly from computer
    if (window.location.protocol === 'file:') {
        alert('Please run this app using http://localhost:3000');
        return;
    }

    // When login button is clicked
    $('#login').click(function (e) {
        e.preventDefault();

        const username = $('#username').val().trim();
        const password = $('#password').val();

        // Check if both fields are filled
        if (!username || !password) {
            showMessage('Please enter both username and password', 'error');
            return;
        }

        // Disable button and show loading
        $('#login').prop('disabled', true).text('Logging in...');

        // Send info to backend
        $.ajax({
            url: '/api/login',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ username, password }),

            success: function (res) {
                if (res.success) {
                    localStorage.setItem('userData', JSON.stringify(res.user));
                    showMessage('Login successful!', 'success');
                    setTimeout(() => window.location.href = 'feed.html', 1000);
                } else {
                    showMessage(res.message || 'Login failed', 'error');
                }
            },

            error: function (err) {
                let msg = err.responseJSON?.message || 'Login failed. Please try again.';
                showMessage(msg, 'error');
            },

            complete: function () {
                $('#login').prop('disabled', false).text('Login');
            }
        });
    });

    // Function to show messages
    function showMessage(text, type) {
        $('#confirmation')
            .removeClass('hidden error')
            .text(text);

        if (type === 'error') {
            $('#confirmation').addClass('error');
        }

        // Hide message after 3 seconds
        setTimeout(() => {
            $('#confirmation').addClass('hidden');
        }, 3000);
    }

});
