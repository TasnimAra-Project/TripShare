$(document).ready(function() {
    // Back to feed
    $('#backToFeedBtn').on('click', function() {
        window.location.href = 'feed.html';
    });

    // Image preview
    $('#imageUpload').on('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                $('#imagePreview').html('<img src="' + e.target.result + '" alt="Preview">');
            };
            reader.readAsDataURL(file);
        } else {
            $('#imagePreview').empty();
        }
    });

    // Form submit
    $('#experienceForm').on('submit', function(e) {
        e.preventDefault();
        const userData = JSON.parse(localStorage.getItem('userData'));
        if (!userData) {
            window.location.href = 'Login.html';
            return;
        }
        const post = {
            type: 'experience',
            author: userData.username,
            content: {
                placeName: $('#placeName').val(),
                country: $('#country').val(),
                safety: $('#safety').val(),
                affordability: $('#affordability').val(),
                description: $('#experienceDescription').val(),
                image: $('#imagePreview img').attr('src') || null
            }
        };
        // Validation (HTML5 required already covers most)
        if (!post.content.placeName || !post.content.country || !post.content.safety || !post.content.affordability || !post.content.description) {
            alert('Please fill in all required fields.');
            return;
        }
        // Post to backend
        $.ajax({
            url: '/api/posts',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(post),
            success: function(response) {
                if (response.success) {
                    window.location.href = 'feed.html';
                } else {
                    alert('Failed to share experience. Please try again.');
                }
            },
            error: function() {
                alert('Failed to share experience. Please try again.');
            }
        });
    });
}); 