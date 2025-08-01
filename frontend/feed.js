$(document).ready(function() {
    //Check if user is logged in
    const userData = JSON.parse(localStorage.getItem('userData'));
    
    if (!userData) {
       window.location.href = 'Login.html';
        return;
    }
    $('#welcomeUser').text('Welcome, ' + userData.username + '!');

    // Logout
    $('#logoutBtn').on('click', function() {
        localStorage.removeItem('userData');
        window.location.href = 'Login.html';
    });

    // Go to post experience page
    $('#shareExperienceBtn').on('click', function() {
        window.location.href = 'post-experience.html';
    });

    // Load posts
    loadPosts();
});

function loadPosts() {
    $.ajax({
        url: '/api/posts',
        method: 'GET',
        success: function(response) {
            if (response.success && response.posts.length > 0) {
                $('#feedPosts').empty();
                response.posts.forEach(post => {
                    const postHtml = createPostHTML(post);
                    $('#feedPosts').append(postHtml);
                });
            } else {
                $('#feedPosts').html('<p style="color:#888;text-align:center;">No travel experiences yet. Be the first to share yours!</p>');
            }
        },
        error: function() {
            $('#feedPosts').html('<p style="color:red;text-align:center;">Failed to load posts.</p>');
        }
    });
}

function createPostHTML(post) {
    let contentHtml = '';
    if (post.type === 'experience') {
        const content = post.content;
        contentHtml = `
            <div class="post-text">
                <h4>${content.placeName}, ${content.country}</h4>
                <p><strong>Safety:</strong> ${getSafetyStars(content.safety)}</p>
                <p><strong>Affordability:</strong> ${getAffordabilitySymbols(content.affordability)}</p>
                <p>${content.description}</p>
            </div>
            ${content.image ? `<img src="${content.image}" alt="Travel photo" class="post-image">` : ''}
        `;
    } else {
        contentHtml = `<div class="post-text">${post.content.text}</div>${post.content.image ? `<img src="${post.content.image}" alt="Post image" class="post-image">` : ''}`;
    }
    return `
        <div class="post-card">
            <div class="post-header">
                <div class="user-avatar-small"><i class="fas fa-user-circle"></i></div>
                <div>
                    <div class="post-author">${post.author}</div>
                    <div class="post-time">${formatTime(post.timestamp)}</div>
                </div>
            </div>
            <div class="post-content">${contentHtml}</div>
            <div class="post-stats">
                <span>${post.likes || 0} likes</span>
                <span>${post.comments || 0} comments</span>
            </div>
        </div>
    `;
}

function getSafetyStars(rating) {
    const stars = '⭐'.repeat(parseInt(rating));
    const labels = ['', 'Unsafe', 'Somewhat Unsafe', 'Moderate', 'Safe', 'Very Safe'];
    return `${stars} ${labels[rating]}`;
}
function getAffordabilitySymbols(rating) {
    const symbols = '💰'.repeat(parseInt(rating));
    const labels = ['', 'Very Affordable', 'Affordable', 'Moderate', 'Expensive', 'Very Expensive'];
    return `${symbols} ${labels[rating]}`;
}
function formatTime(timestamp) {
    const now = new Date();
    const postTime = new Date(timestamp);
    const diffMs = now - postTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return postTime.toLocaleDateString();
} 