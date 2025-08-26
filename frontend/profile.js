$(document).ready(function() {
    // Check if user is logged in
    const userData = JSON.parse(localStorage.getItem('userData'));
    
    if (!userData) {
        window.location.href = 'Login.html';
        return;
    }
    
  
    
    // Initialize profile
    initializeProfile();
    
    // Handle profile form submission
    $('#profileForm').on('submit', function(e) {
        e.preventDefault();
        saveProfile();
    });
    
    // Handle photo uploads
    $('#profilePhoto').on('change', function(e) {
        handlePhotoUpload(e.target.files[0], 'profilePhotoPreview', 'profilePhotoDisplay');
    });
    
    $('#coverPhoto').on('change', function(e) {
        handlePhotoUpload(e.target.files[0], 'coverPhotoPreview', 'coverPhotoContainer');
    });
    
    // Handle tab switching
    $('.tab-btn').on('click', function() {
        $('.tab-btn').removeClass('active');
        $(this).addClass('active');
        $('.tab-content').addClass('hidden');
        $('#' + $(this).data('tab') + 'TabContent').removeClass('hidden');
    });
    
    // Initially show posts tab
    $('.tab-btn[data-tab="posts"]').click();

    // Handle edit profile button
    $('#editProfileBtn').on('click', function() {
        showProfileSetup();
    });
    
    // Handle cancel edit button
    $('#cancelEditBtn').on('click', function() {
        // Get current user data and display profile again
        const userData = JSON.parse(localStorage.getItem('userData'));
        displayProfile(userData);
    });
    
    // Handle filter functionality
    $('#searchInput, #countryFilter, #safetyFilter, #affordabilityFilter, #sortFilter').on('change keyup', function() {
        filterAndSortPosts();
    });
    
    // Handle clear filters button
    $('#clearFilters').on('click', function() {
        $('#searchInput').val('');
        $('#countryFilter').val('');
        $('#safetyFilter').val('');
        $('#affordabilityFilter').val('');
        $('#sortFilter').val('newest');
        filterAndSortPosts();
    });
});

function initializeProfile() {
    console.log('initializeProfile called');
    // Show loading state
    $('#loadingState').removeClass('hidden');
    $('#profileSetup').addClass('hidden');
    $('#profileDisplay').addClass('hidden');
    
    // Check if we're viewing someone else's profile
    const viewProfileFor = localStorage.getItem('viewProfileFor');
    console.log('viewProfileFor from localStorage:', viewProfileFor);
    
    if (viewProfileFor) {
        // Clear the flag so it doesn't persist
        localStorage.removeItem('viewProfileFor');
        console.log('Loading other user profile for:', viewProfileFor);
        // Load the other user's profile
        loadOtherUserProfile(viewProfileFor);
    } else {
        console.log('Loading own profile');
        // Check if user has a profile (own profile)
        checkUserProfile();
    }
}

function loadOtherUserProfile(username) {
    console.log('Loading profile for user:', username);
    
    // Show loading state
    $('#loadingState').removeClass('hidden');
    $('#profileSetup').addClass('hidden');
    $('#profileDisplay').addClass('hidden');
    
    // Try to find user data and posts
    const allPosts = JSON.parse(localStorage.getItem('localPosts') || '[]');
    const userPosts = allPosts.filter(post => post.author === username);
    
    console.log('Found posts for user:', userPosts.length);
    
    // Look for profile and cover photos in user's posts
    let profilePhoto = null;
    let coverPhoto = null;
    
    // Check if any posts have profile or cover photos
    userPosts.forEach(post => {
        if (post.content && post.content.profilePhoto && !profilePhoto) {
            profilePhoto = post.content.profilePhoto;
        }
        if (post.content && post.content.coverPhoto && !coverPhoto) {
            coverPhoto = post.content.coverPhoto;
        }
    });
    
    // Also check if user has profile photos stored in localStorage
    const userProfilePhoto = localStorage.getItem(`userProfilePhoto_${username}`);
    const userCoverPhoto = localStorage.getItem(`userCoverPhoto_${username}`);
    
    if (userProfilePhoto && !profilePhoto) {
        profilePhoto = userProfilePhoto;
    }
    if (userCoverPhoto && !coverPhoto) {
        coverPhoto = userCoverPhoto;
    }
    
    console.log('Found profile photo:', !!profilePhoto, 'Found cover photo:', !!coverPhoto);
    
    // Create a mock profile for the other user
    const otherUserProfile = {
        username: username,
        fullName: username, // We don't have this info, so use username
        location: 'Location not set',
        bio: 'No bio available',
        profilePhoto: profilePhoto,
        coverPhoto: coverPhoto,
        isOtherUser: true
    };
    
    // Store the profile data in localStorage so it persists on reload
    localStorage.setItem(`otherUserProfile_${username}`, JSON.stringify(otherUserProfile));
    
    // Display the other user's profile
    displayProfile(otherUserProfile);
    
    // Load their posts
    loadUserPosts(username);
    
    // Load their stats
    loadProfileStats(username);
    
    // Hide loading
    $('#loadingState').addClass('hidden');
}

function handleFollowClick(username) {
    const currentUser = JSON.parse(localStorage.getItem('userData'));
    if (!currentUser) return;
    
    // Get current follow status
    const followKey = `follow_${currentUser.username}_${username}`;
    const isFollowing = localStorage.getItem(followKey) === 'true';
    
    if (isFollowing) {
        // Unfollow
        localStorage.removeItem(followKey);
        $('#followBtn').text('Follow').removeClass('following');
        showMessage(`Unfollowed ${username}`, 'success');
    } else {
        // Follow
        localStorage.setItem(followKey, 'true');
        $('#followBtn').text('Following').addClass('following');
        showMessage(`Started following ${username}`, 'success');
    }
}

function handleMessageClick(username) {
    // For now, just show a message. In a real app, this would open a chat
    showMessage(`Message feature coming soon! You can message ${username}`, 'info');
}

function checkUserProfile() {
    const userData = JSON.parse(localStorage.getItem('userData'));
    
    $.ajax({
        url: `/api/profile/${userData.id}`,
        method: 'GET',
        success: function(response) {
            if (response.success && response.profile) {
                // User has a profile, show it
                displayProfile(response.profile);
            } else {
                // User doesn't have a profile, show setup form (or a default empty state for the new design)
                // For now, if no profile, we'll show a default display with no data.
                displayProfile({}); // Display empty profile
            }
        },
        error: function(xhr, status, error) {
            console.error('Error checking profile:', error);
            // Even on error, attempt to display an empty profile
            displayProfile({});
        },
        complete: function() {
            $('#loadingState').addClass('hidden');
        }
    });
}

function showProfileSetup() {
    $('#profileSetup').removeClass('hidden');
    $('#profileDisplay').addClass('hidden');
    
    // Pre-fill form with existing user data
    const userData = JSON.parse(localStorage.getItem('userData'));
    $('#username').val(userData.username || '');
    $('#fullName').val(userData.fullName || '');
    $('#location').val(userData.location || '');
    $('#bio').val(userData.bio || '');

    // Pre-fill with current display values if userData doesn't have them
    if (!userData.fullName && $('#profileFullName').text() !== 'Your Name') {
        $('#fullName').val($('#profileFullName').text());
    }
    if (!userData.location && $('#profileLocation').text() !== 'Location not set') {
        $('#location').val($('#profileLocation').text());
    }
    if (!userData.bio && $('#profileBio').text() !== 'No bio added yet.') {
        $('#bio').val($('#profileBio').text());
    }

    // Show current photos if available
    const currentProfilePhoto = $('#profilePhotoDisplay').attr('src');
    const currentCoverPhoto = $('#coverPhotoContainer img').attr('src');
    
    if (currentProfilePhoto && !currentProfilePhoto.includes('placeholder')) {
        $('#profilePhotoPreview').html(`<img src="${currentProfilePhoto}" alt="Photo preview">`).removeClass('hidden');
    }
    if (currentCoverPhoto && !currentCoverPhoto.includes('placeholder')) {
        $('#coverPhotoPreview').html(`<img src="${currentCoverPhoto}" alt="Photo preview">`).removeClass('hidden');
    }
}

function displayProfile(profile) {
    const userData = JSON.parse(localStorage.getItem('userData'));
    console.log('Displaying profile:', profile);
    console.log('Current user data:', userData);
    
    // Set the current profile username globally
    currentProfileUsername = profile.username || userData.username;
    
    $('#profileSetup').addClass('hidden');
    $('#profileDisplay').removeClass('hidden');
    
    // Determine if this is the current user's profile or someone else's
    const isOwnProfile = !profile.isOtherUser && (!profile.userId || profile.userId === userData.id || profile.username === userData.username);
    console.log('Is own profile:', isOwnProfile);
    
    // Show/hide back button based on profile ownership
    if (isOwnProfile) {
        $('#backBtn').hide();
    } else {
        $('#backBtn').show();
    }
    
    // Show appropriate buttons based on profile ownership
    if (isOwnProfile) {
        $('#followBtn, #messageBtn').hide();
        $('#editProfileBtn').show();
    } else {
        $('#editProfileBtn').hide();
        $('#followBtn, #messageBtn').show();
        
        console.log('Showing follow/message buttons for other user');
        
        // Update button text for other user's profile
        $('#followBtn').text('Follow').removeClass('following');
        $('#messageBtn').text('Message');
        
        // Check if already following
        const followKey = `follow_${userData.username}_${profile.username}`;
        const isFollowing = localStorage.getItem(followKey) === 'true';
        if (isFollowing) {
            $('#followBtn').text('Following').addClass('following');
        }
        
        // Add click handlers for follow and message buttons
        $('#followBtn').off('click').on('click', function() {
            handleFollowClick(profile.username);
        });
        
        $('#messageBtn').off('click').on('click', function() {
            handleMessageClick(profile.username);
        });
    }
    
    // Update profile information
    if (isOwnProfile) {
        $('#profileFullName').text(profile.fullName || userData.fullName || 'Your Name');
        $('#profileUsername').text('@' + (profile.username || userData.username || 'username'));
    } else {
        $('#profileFullName').text(profile.fullName || profile.username);
        $('#profileUsername').text('@' + profile.username);
    }
    
    if (profile.location || (isOwnProfile && userData.location)) {
        $('#profileLocation').text(profile.location || userData.location);
    } else {
        $('#profileLocation').text('Location not set');
    }
    
    // Set joined date (could be from profile data or user registration date)
    if (isOwnProfile) {
        $('#profileJoinedDate').text(profile.joinedDate || userData.joinedDate || formatJoinedDate(userData.id));
    } else {
        $('#profileJoinedDate').text('Member');
    }

    if (profile.bio || (isOwnProfile && userData.bio)) {
        $('#profileBio').text(profile.bio || userData.bio);
    } else {
        $('#profileBio').text(isOwnProfile ? 'No bio added yet.' : 'No bio available');
    }
    
    // Update About tab title with user's name
    $('#aboutTitle').text('About ' + (profile.fullName || profile.username || 'User'));
    
    // Update level badge (could be based on number of posts, countries visited, etc.)
    const level = calculateUserLevel(profile);
    $('#levelBadge').text(level);
    
    // Update profile photos with better persistence
    let profilePhoto, coverPhoto;
    
    if (isOwnProfile) {
        profilePhoto = profile.profilePhoto || 
                      userData.profilePhoto || 
                      localStorage.getItem('userProfilePhoto');
        coverPhoto = profile.coverPhoto || 
                    userData.coverPhoto || 
                    localStorage.getItem('userCoverPhoto');
    } else {
        // For other users, use their photos if available
        profilePhoto = profile.profilePhoto;
        coverPhoto = profile.coverPhoto;
    }
    
    // Set profile photo
    if (profilePhoto && profilePhoto !== 'https://via.placeholder.com/150' && profilePhoto.startsWith('data:image/')) {
        $('#profilePhotoDisplay').attr('src', profilePhoto);
    } else {
        $('#profilePhotoDisplay').attr('src', 'https://via.placeholder.com/150'); // Default avatar
    }
    
    // Set cover photo
    if (coverPhoto && coverPhoto !== 'https://via.placeholder.com/1200x300?text=Cover+Photo' && coverPhoto.startsWith('data:image/')) {
        $('#coverPhotoContainer img').attr('src', coverPhoto);
    } else {
        $('#coverPhotoContainer img').attr('src', 'https://via.placeholder.com/1200x300?text=Cover+Photo'); // Default cover
    }
    
    // Load user posts
    const usernameToLoad = profile.username || userData.username;
    loadUserPosts(usernameToLoad);
    
    // Load profile stats
    loadProfileStats(usernameToLoad);
}

// Function to view a specific post
function viewPost(postId, event) {
    event.preventDefault();
    
    if (!postId) {
        console.log('No post ID provided');
        return;
    }
    
    // Find the post in allUserPosts or fetch from server
    const post = allUserPosts.find(p => p.id === postId);
    
    if (post) {
        showPostModal(post);
    } else {
        // Try to fetch from server or local storage
        console.log('Post not found locally, you could implement server fetch here');
        showMessage('Post not found', 'error');
    }
}

// Function to show post in a modal
function showPostModal(post) {
    const content = post.content;
    const hasImage = content.image && 
                     content.image.startsWith('data:image/') &&
                     content.image.length > 100;
    
    const modalHtml = `
        <div class="post-modal-overlay" id="postModal">
            <div class="post-modal">
                <div class="post-modal-header">
                    <h2>${post.type === 'experience' ? (content.placeName || 'Experience') : (content.title || 'Post')}</h2>
                    <button class="modal-close" onclick="closePostModal()">&times;</button>
                </div>
                <div class="post-modal-content">
                    ${hasImage ? `<img src="${content.image}" alt="Post image" class="modal-image">` : ''}
                    <div class="post-modal-info">
                        ${post.type === 'experience' ? `
                            <p class="modal-location"><i class="fas fa-map-marker-alt"></i> ${getFullLocationString(content)}</p>
                            <div class="modal-meta">
                                <span class="safety-rating">${getSafetyStars(content.safety)}</span>
                                <span class="country-tag">${content.country}</span>
                                <span class="affordability-tag">${getAffordabilityText(content.affordability)}</span>
                            </div>
                        ` : ''}
                        <p class="modal-description">${content.description || content.text}</p>
                        <div class="modal-footer">
                            <span class="modal-date"><i class="fas fa-calendar-alt"></i> ${formatTime(post.timestamp)}</span>
                            <span class="modal-author"><i class="fas fa-user"></i> ${post.author || 'Unknown'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    $('body').append(modalHtml);
    $('#postModal').fadeIn(300);
}

// Function to close post modal
function closePostModal() {
    $('#postModal').fadeOut(300, function() {
        $(this).remove();
    });
}

// Helper function to build full location string
function getFullLocationString(content) {
    if (!content) return 'Unknown Location';
    
    const locationParts = [
        content.placeName,
        content.address,
        content.city,
        content.state,
        content.country
    ].filter(part => part && part.trim() !== '');
    
    return locationParts.length > 0 ? locationParts.join(', ') : 'Unknown Location';
}

// Function to load user photos into the Photos tab
function loadUserPhotos(userPosts) {
    const photosWithImages = userPosts.filter(post => {
        const hasValidImage = post.content && 
                             post.content.image && 
                             post.content.image.startsWith('data:image/') &&
                             post.content.image.length > 100;
        return hasValidImage;
    });
    
    if (photosWithImages.length === 0) {
        $('#userPhotos').html('<p class="no-photos-message">No photos posted yet.</p>');
        return;
    }
    
    const photosHtml = photosWithImages.map(post => {
        const content = post.content;
        return `
            <div class="photo-item" onclick="viewPost('${post.id || ''}', event)">
                <img src="${content.image}" alt="Photo from ${content.placeName || content.title || 'post'}" class="user-photo">
                <div class="photo-overlay">
                    <div class="photo-info">
                        <h4>${post.type === 'experience' ? (content.placeName || 'Experience') : (content.title || 'Photo')}</h4>
                        <p><i class="fas fa-calendar-alt"></i> ${formatTime(post.timestamp)}</p>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    $('#userPhotos').html(photosHtml);
}

function saveProfile() {
    const userData = JSON.parse(localStorage.getItem('userData'));
    
    // Validation first
    const fullName = $('#fullName').val().trim();
    const username = $('#username').val().trim();
    
    if (!fullName || !username) {
        showMessage('Full name and username are required', 'error');
        return;
    }
    
    // Show loading state
    $('#profileForm button[type="submit"]').prop('disabled', true).text('Saving...');
    
    // Get form data
    const profileData = {
        userId: userData.id,
        fullName: fullName,
        username: username,
        location: $('#location').val().trim(),
        bio: $('#bio').val().trim()
    };
    
    // Handle photo uploads
    const profilePhotoFile = $('#profilePhoto')[0].files[0];
    const coverPhotoFile = $('#coverPhoto')[0].files[0];

    let photoPromises = [];

    // Process profile photo if uploaded
    if (profilePhotoFile) {
        photoPromises.push(
            getPhotoDataUrl('profilePhoto').then(dataUrl => {
                profileData.profilePhoto = dataUrl;
                return dataUrl;
            }).catch(error => {
                console.error('Error processing profile photo:', error);
                return null;
            })
        );
    } else {
        // Keep existing photo if no new upload
        const currentProfilePhoto = $('#profilePhotoDisplay').attr('src');
        if (currentProfilePhoto && !currentProfilePhoto.includes('placeholder')) {
            profileData.profilePhoto = currentProfilePhoto;
        }
    }
    
    // Process cover photo if uploaded
    if (coverPhotoFile) {
        photoPromises.push(
            getPhotoDataUrl('coverPhoto').then(dataUrl => {
                profileData.coverPhoto = dataUrl;
                return dataUrl;
            }).catch(error => {
                console.error('Error processing cover photo:', error);
                return null;
            })
        );
    } else {
        // Keep existing photo if no new upload
        const currentCoverPhoto = $('#coverPhotoContainer img').attr('src');
        if (currentCoverPhoto && !currentCoverPhoto.includes('placeholder')) {
            profileData.coverPhoto = currentCoverPhoto;
        }
    }

    Promise.all(photoPromises).then(() => {
        console.log('Profile data to save:', profileData);
        
        // Save profile to backend
        $.ajax({
            url: '/api/profile',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(profileData),
            success: function(response) {
                if (response.success) {
                    showMessage('Profile saved successfully!', 'success');
                    
                    // Update user data in localStorage
                    const updatedUserData = { ...userData, ...profileData };
                    localStorage.setItem('userData', JSON.stringify(updatedUserData));
                    
                    // Also store photos separately for better persistence
                    if (updatedUserData.profilePhoto) {
                        localStorage.setItem('userProfilePhoto', updatedUserData.profilePhoto);
                    }
                    if (updatedUserData.coverPhoto) {
                        localStorage.setItem('userCoverPhoto', updatedUserData.coverPhoto);
                    }
                    
                    // Show profile display with updated data
                    setTimeout(function() {
                        displayProfile(updatedUserData);
                    }, 1000);
                } else {
                    showMessage(response.message || 'Failed to save profile', 'error');
                }
            },
            error: function(xhr, status, error) {
                console.error('Error saving profile:', xhr, status, error);
                
                // For now, save to localStorage even if backend fails
                showMessage('Profile saved locally (server unavailable)', 'success');
                
                // Update user data in localStorage
                const updatedUserData = { ...userData, ...profileData };
                localStorage.setItem('userData', JSON.stringify(updatedUserData));
                
                // Also store photos separately for better persistence
                if (updatedUserData.profilePhoto) {
                    localStorage.setItem('userProfilePhoto', updatedUserData.profilePhoto);
                }
                if (updatedUserData.coverPhoto) {
                    localStorage.setItem('userCoverPhoto', updatedUserData.coverPhoto);
                }
                
                // Show profile display with updated data
                setTimeout(function() {
                    displayProfile(updatedUserData);
                }, 1000);
            },
            complete: function() {
                $('#profileForm button[type="submit"]').prop('disabled', false).text('Save Profile');
            }
        });
    }).catch(error => {
        console.error('Error processing photos:', error);
        showMessage('Error processing photos. Please try again.', 'error');
        $('#profileForm button[type="submit"]').prop('disabled', false).text('Save Profile');
    });
}

function handlePhotoUpload(file, previewId, displayId) {
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = $(`#${previewId}`);
            preview.html(`<img src="${e.target.result}" alt="Photo preview">`);
            preview.removeClass('hidden');

            // Update the display image immediately
            if (displayId === 'profilePhotoDisplay') {
                $('#profilePhotoDisplay').attr('src', e.target.result);
                // Save to localStorage for other users to access
                const userData = JSON.parse(localStorage.getItem('userData'));
                if (userData && userData.username) {
                    localStorage.setItem(`userProfilePhoto_${userData.username}`, e.target.result);
                }
            } else if (displayId === 'coverPhotoContainer') {
                $('#coverPhotoContainer img').attr('src', e.target.result);
                // Save to localStorage for other users to access
                const userData = JSON.parse(localStorage.getItem('userData'));
                if (userData && userData.username) {
                    localStorage.setItem(`userCoverPhoto_${userData.username}`, e.target.result);
                }
            }
        };
        reader.readAsDataURL(file);
    }
}

function getPhotoDataUrl(inputId) {
    const file = $(`#${inputId}`)[0].files[0];
    if (file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                resolve(e.target.result);
            };
            reader.readAsDataURL(file);
        });
    }
    return Promise.resolve(null);
}

// Global variable to store all user posts for filtering
let allUserPosts = [];
// Global variable to track current profile username
let currentProfileUsername = '';

function loadUserPosts(username) {
    $.ajax({
        url: '/api/posts',
        method: 'GET',
        success: function(response) {
            if (response.success && response.posts.length > 0) {
                const userPosts = response.posts.filter(post => post.author === username);
                allUserPosts = userPosts; // Store for filtering
                
                // Populate country filter dropdown
                populateCountryFilter(userPosts);
                
                // Display posts (initially unfiltered)
                displayUserPosts(userPosts);
                
                // Update post count in stats
                $('#postsCount').text(userPosts.length);
                
                // Calculate unique countries and photos from posts
                const uniqueCountries = new Set();
                let photoCount = 0;
                
                userPosts.forEach(post => {
                    if (post.type === 'experience' && post.content.country) {
                        uniqueCountries.add(post.content.country);
                    }
                    if (post.content.image) {
                        photoCount++;
                    }
                });
                
                $('#countriesCount').text(uniqueCountries.size);
                $('#photosCount').text(photoCount);
                
                // Load photos for the Photos tab
                loadUserPhotos(userPosts);
                
                // Recalculate user level after stats update
                const userData = JSON.parse(localStorage.getItem('userData'));
                const level = calculateUserLevel({ username: userData.username });
                $('#levelBadge').text(level);
                
            } else {
                $('#userPosts').html('<p style="color:#a0aec0;text-align:center;">No posts yet. Share your first travel experience!</p>');
                allUserPosts = []; // Clear posts array
                // Set counts to 0 if no posts
                $('#postsCount').text('0');
                $('#photosCount').text('0');
                $('#countriesCount').text('0');
            }
        },
        error: function() {
            $('#userPosts').html('<p style="color:#e53e3e;text-align:center;">Failed to load posts.</p>');
            allUserPosts = []; // Clear posts array
            // Set default values on error
            setDefaultStats();
        }
    });
}

function displayUserPosts(posts) {
    const postsHtml = posts.map(post => createPostHTML(post)).join('');
    $('#userPosts').html(postsHtml);
    
    // Add error handling for images after they're loaded
    $('#userPosts img.post-image-new').on('error', function() {
        console.log('Image failed to load, hiding it:', this.src);
        $(this).hide();
    });
    
    // Check for corrupted base64 images and hide them
    $('#userPosts img.post-image-new').each(function() {
        const src = $(this).attr('src');
        if (src && src.startsWith('data:image/')) {
            // Check if the base64 data looks corrupted (too short or invalid format)
            const base64Data = src.split(',')[1];
            if (!base64Data || base64Data.length < 100 || base64Data.includes('undefined')) {
                console.log('Corrupted image detected, hiding it:', src.substring(0, 50) + '...');
                $(this).hide();
            }
        }
    });
}

function createPostHTML(post) {
    let contentHtml = '';
    if (post.type === 'experience') {
        const content = post.content;
        // Only show image if it exists, is not a placeholder, and is valid
        const hasImage = content.image && 
                         content.image !== 'https://via.placeholder.com/400x250?text=No+Image' &&
                         !content.image.includes('placeholder') &&
                         content.image.trim() !== '' &&
                         content.image.startsWith('data:image/') &&
                         content.image.length > 100; // Ensure it's not corrupted
        
        contentHtml = `
            ${hasImage ? `<img src="${content.image}" alt="Travel photo" class="post-image-new">` : ''}
            <div class="post-card-content">
                <h3>${content.placeName || 'Untitled'}</h3>
                <p class="post-location"><i class="fas fa-map-marker-alt"></i> ${getFullLocationString(content)}</p>
                <div class="post-meta-new">
                    <span class="safety-rating">${getSafetyStars(content.safety)}</span>
                    <span class="country-tag">${content.country}</span>
                </div>
                <p class="post-description">${content.description}</p>
                <div class="post-footer-new">
                    <span class="post-date"><i class="fas fa-calendar-alt"></i> ${formatTime(post.timestamp)}</span>
                    <a href="#" class="view-post-link" data-post-id="${post.id || ''}" onclick="viewPost('${post.id || ''}', event)">View</a>
                </div>
            </div>
        `;
    } else {
        // For other post types, only show image if it actually exists and is valid
        const hasImage = post.content.image && 
                         !post.content.image.includes('placeholder') &&
                         post.content.image.trim() !== '' &&
                         post.content.image.startsWith('data:image/') &&
                         post.content.image.length > 100; // Ensure it's not corrupted
        
        contentHtml = `
            ${hasImage ? `<img src="${post.content.image}" alt="Post image" class="post-image-new">` : ''}
            <div class="post-card-content">
                <h3>${post.content.title || 'Untitled Post'}</h3>
                <p class="post-description">${post.content.text}</p>
                <div class="post-footer-new">
                    <span class="post-date"><i class="fas fa-calendar-alt"></i> ${formatTime(post.timestamp)}</span>
                    <a href="#" class="view-post-link" data-post-id="${post.id || ''}" onclick="viewPost('${post.id || ''}', event)">View</a>
                </div>
            </div>
        `;
    }
    
    return `
        <div class="post-card-new">
            ${contentHtml}
        </div>
    `;
}

function loadProfileStats(username) {
    // Calculate followers count from localStorage
    const currentUser = JSON.parse(localStorage.getItem('userData'));
    let followersCount = 0;
    let followingCount = 0;
    
    if (currentUser && username !== currentUser.username) {
        // Count how many users are following this user
        const keys = Object.keys(localStorage);
        followersCount = keys.filter(key => 
            key.startsWith('follow_') && 
            key.endsWith(`_${username}`) && 
            localStorage.getItem(key) === 'true'
        ).length;
    }
    
    // Calculate following count (who the current user is following)
    if (currentUser) {
        const keys = Object.keys(localStorage);
        followingCount = keys.filter(key => 
            key.startsWith(`follow_${currentUser.username}_`) && 
            localStorage.getItem(key) === 'true'
        ).length;
    }
    
    // Update counts display
    $('#followersCount').text(followersCount);
    $('#followingCount').text(followingCount);
    
    // Try to get additional stats from backend
    $.ajax({
        url: `/api/profile/${username}/stats`,
        method: 'GET',
        success: function(response) {
            if (response.success && response.stats) {
                // Only update if we don't have local data
                if (followersCount === 0) {
                    $('#followersCount').text(response.stats.followers || 0);
                }
            }
        },
        error: function() {
            // Keep the local followers count
            console.log('Using local followers count:', followersCount);
        }
    });
}

function setDefaultStats() {
    $('#postsCount').text('0');
    $('#photosCount').text('0');
    $('#countriesCount').text('0');
    $('#followersCount').text('0');
    $('#followingCount').text('0');
}

function showMessage(message, type) {
    // Create a temporary message display
    const messageHtml = `
        <div class="message ${type}" style="
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 10px;
            color: #fff;
            font-weight: 600;
            z-index: 1000;
            background: ${type === 'success' ? '#48bb78' : '#e53e3e'}; /* Green for success, Red for error */
            box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        ">
            ${message}
        </div>
    `;
    
    $('body').append(messageHtml);
    
    // Remove message after 3 seconds
    setTimeout(function() {
        $('.message').fadeOut(300, function() {
            $(this).remove();
        });
    }, 3000);
}

// Utility functions (copied from dashboard.js)
function getSafetyStars(rating) {
    const stars = '⭐'.repeat(parseInt(rating));
    const labels = ['', 'Unsafe', 'Somewhat Unsafe', 'Moderate', 'Safe', 'Very Safe'];
    return `${stars} ${labels[rating]}`;
}

function getAffordabilityText(rating) {
    const money = '💰'.repeat(parseInt(rating));
    const labels = ['', 'Very Affordable', 'Affordable', 'Moderate', 'Expensive', 'Very Expensive'];
    return `${money} ${labels[rating]}`;
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

function formatJoinedDate(userId) {
    // Simple fallback based on user ID or current date
    // In a real app, this would come from user registration data
    return new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
}

function calculateUserLevel(profile) {
    // Calculate user level based on activity
    // This is a simple example - you can make it more complex
    const posts = parseInt($('#postsCount').text()) || 0;
    const countries = parseInt($('#countriesCount').text()) || 0;
    
    if (posts === 0 && countries === 0) {
        return 'Level 1 • Beginner';
    } else if (posts < 5 || countries < 2) {
        return 'Level 2 • Novice';
    } else if (posts < 15 || countries < 5) {
        return 'Level 3 • Traveler';
    } else if (posts < 25 || countries < 8) {
        return 'Level 4 • Explorer';
    } else {
        return 'Level 5 • Adventure Master';
    }
}

function populateCountryFilter(posts) {
    const locations = new Set();
    
    posts.forEach(post => {
        if (post.type === 'experience' && post.content) {
            // Only add states and cities (no countries - too broad)
            if (post.content.state) {
                locations.add(post.content.state);
            }
            if (post.content.city) {
                locations.add(post.content.city);
            }
        }
    });
    
    // Add all 50 US states
    const allUSStates = [
        'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 
        'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 
        'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 
        'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 
        'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 
        'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 
        'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 
        'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 
        'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
    ];
    
    allUSStates.forEach(state => locations.add(state));
    
    // Clean up duplicate/similar locations
    const cleanedLocations = new Set();
    const locationMap = new Map([
        ['nyc', 'New York'],
        ['ny', 'New York'], 
        ['manhattan', 'New York'],
        ['brooklyn', 'New York'],
        ['queens', 'New York'],
        ['bronx', 'New York'],
        ['la', 'Los Angeles'],
        ['san fran', 'San Francisco'],
        ['sf', 'San Francisco'],
        ['dc', 'Washington DC'],
        ['washington dc', 'Washington DC']
    ]);
    
    locations.forEach(location => {
        const normalized = location.toLowerCase();
        const mapped = locationMap.get(normalized);
        cleanedLocations.add(mapped || location);
    });
    
    const countrySelect = $('#countryFilter');
    // Clear existing options except the first one
    countrySelect.find('option:not(:first)').remove();
    
    // Sort cleaned locations alphabetically and add them
    Array.from(cleanedLocations).sort().forEach(location => {
        countrySelect.append(`<option value="${location}">${location}</option>`);
    });
}

function filterAndSortPosts() {
    if (allUserPosts.length === 0) return;
    
    let filteredPosts = [...allUserPosts];
    
    // Apply search filter - now searches across all text fields
    const searchTerm = $('#searchInput').val().toLowerCase().trim();
    if (searchTerm) {
        filteredPosts = filteredPosts.filter(post => {
            const content = post.content || {};
            const searchableText = [
                content.placeName,
                content.description,
                content.country,
                content.state,
                content.city,
                content.address,
                post.author
            ].filter(Boolean).join(' ').toLowerCase();
            
            // Split search term to allow partial matches
            const searchWords = searchTerm.split(' ').filter(word => word.length > 0);
            return searchWords.some(word => searchableText.includes(word));
        });
    }
    
    // Apply location filter (now works for countries, states, and cities)
    const locationFilter = $('#countryFilter').val();
    if (locationFilter) {
        filteredPosts = filteredPosts.filter(post => {
            const content = post.content || {};
            return content.country === locationFilter || 
                   content.state === locationFilter || 
                   content.city === locationFilter;
        });
    }
    
    // Apply safety filter
    const safetyFilter = $('#safetyFilter').val();
    if (safetyFilter) {
        filteredPosts = filteredPosts.filter(post => 
            post.type === 'experience' && post.content.safety == safetyFilter
        );
    }
    
    // Apply affordability filter
    const affordabilityFilter = $('#affordabilityFilter').val();
    if (affordabilityFilter) {
        filteredPosts = filteredPosts.filter(post => 
            post.type === 'experience' && post.content.affordability == affordabilityFilter
        );
    }
    
    // Apply sorting
    const sortOption = $('#sortFilter').val();
    switch (sortOption) {
        case 'oldest':
            filteredPosts.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            break;
        case 'safety-high':
            filteredPosts.sort((a, b) => (b.content.safety || 0) - (a.content.safety || 0));
            break;
        case 'safety-low':
            filteredPosts.sort((a, b) => (a.content.safety || 0) - (b.content.safety || 0));
            break;
        case 'affordable':
            filteredPosts.sort((a, b) => (a.content.affordability || 0) - (b.content.affordability || 0));
            break;
        case 'expensive':
            filteredPosts.sort((a, b) => (b.content.affordability || 0) - (a.content.affordability || 0));
            break;
        case 'newest':
        default:
            filteredPosts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            break;
    }
    
    // Display filtered posts
    if (filteredPosts.length > 0) {
        displayUserPosts(filteredPosts);
    } else {
        $('#userPosts').html('<p style="color:#a0aec0;text-align:center;">No posts match your filters.</p>');
    }
}

function goBack() {
    // Clear any stored other user profile data
    if (currentProfileUsername) {
        localStorage.removeItem(`otherUserProfile_${currentProfileUsername}`);
        localStorage.removeItem(`userProfilePhoto_${currentProfileUsername}`);
        localStorage.removeItem(`userCoverPhoto_${currentProfileUsername}`);
    }
    
    // Navigate back to the dashboard
    window.location.href = 'dashboard.html';
}

function showFollowersList(username) {
    const currentUser = JSON.parse(localStorage.getItem('userData'));
    if (!currentUser || username === currentUser.username) {
        showMessage('You can only view followers of other users', 'info');
        return;
    }
    
    // Get all users who are following this user
    const keys = Object.keys(localStorage);
    const followers = keys
        .filter(key => 
            key.startsWith('follow_') && 
            key.endsWith(`_${username}`) && 
            localStorage.getItem(key) === 'true'
        )
        .map(key => key.replace('follow_', '').replace(`_${username}`, ''));
    
    if (followers.length === 0) {
        showMessage(`${username} has no followers yet`, 'info');
        return;
    }
    
    // Create followers list modal
    const followersHtml = `
        <div class="followers-modal-overlay" id="followersModal">
            <div class="followers-modal">
                <div class="followers-modal-header">
                    <h3>${username}'s Followers (${followers.length})</h3>
                    <button class="close-followers" onclick="closeFollowersModal()">&times;</button>
                </div>
                <div class="followers-list">
                    ${followers.map(follower => `
                        <div class="follower-item">
                            <div class="follower-info">
                                <span class="follower-username">@${follower}</span>
                            </div>
                            <button class="view-profile-btn" onclick="viewUserProfile('${follower}')">
                                View Profile
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    
    $('body').append(followersHtml);
    $('#followersModal').fadeIn(300);
}

function closeFollowersModal() {
    $('#followersModal').fadeOut(300, function() {
        $(this).remove();
    });
}

function showFollowingList(username) {
    const currentUser = JSON.parse(localStorage.getItem('userData'));
    if (!currentUser || username !== currentUser.username) {
        showMessage('You can only view who you are following', 'info');
        return;
    }
    
    // Get all users that the current user is following
    const keys = Object.keys(localStorage);
    const following = keys
        .filter(key => 
            key.startsWith(`follow_${username}_`) && 
            localStorage.getItem(key) === 'true'
        )
        .map(key => key.replace(`follow_${username}_`, ''));
    
    if (following.length === 0) {
        showMessage('You are not following anyone yet', 'info');
        return;
    }
    
    // Create following list modal
    const followingHtml = `
        <div class="followers-modal-overlay" id="followingModal">
            <div class="followers-modal">
                <div class="followers-modal-header">
                    <h3>You are following (${following.length})</h3>
                    <button class="close-followers" onclick="closeFollowingModal()">&times;</button>
                </div>
                <div class="followers-list">
                    ${following.map(followedUser => `
                        <div class="follower-item">
                            <div class="follower-info">
                                <span class="follower-username">@${followedUser}</span>
                            </div>
                            <button class="view-profile-btn" onclick="viewUserProfile('${followedUser}')">
                                View Profile
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    
    $('body').append(followingHtml);
    $('#followingModal').fadeIn(300);
}

function closeFollowingModal() {
    $('#followingModal').fadeOut(300, function() {
        $(this).remove();
    });
}
