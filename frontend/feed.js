/* feed.js */
$(document).ready(function () {
    // ========= Config =========
    // If your API lives elsewhere, set it once and forget:
    // localStorage.setItem('apiBaseUrl', 'https://your-backend.example.com');
    const API_BASE = (localStorage.getItem('apiBaseUrl') || '').replace(/\/$/, '');
    const POSTS_ENDPOINT = API_BASE ? `${API_BASE}/api/posts` : '/api/posts';
  
    // ========= Auth gate =========
    const userData = safeParse(localStorage.getItem('userData')) || null;
    if (!userData) {
      window.location.href = 'Login.html';
      return;
    }
    $('#welcomeUser').text(`Welcome, ${userData.username}!`);
  
    // ========= UI bindings =========
    $('#logoutBtn').on('click', () => {
      localStorage.removeItem('userData');
      window.location.href = 'Login.html';
    });
  
    $('#shareExperienceBtn').on('click', () => {
      window.location.href = 'post-experience.html';
    });
    
    // Notification bell click handler
    $('#notificationBell').on('click', function() {
      showNotifications();
    });
    
    // Initialize notification system
    updateNotificationBadge();
  

    
    // Like and comment event handlers (using event delegation)
    $(document).on('click', '.like-btn', handleLikeClick);
    $(document).on('click', '.comment-btn', handleCommentToggle);
    $(document).on('click', '.post-comment-btn', handlePostComment);
    $(document).on('keypress', '.comment-input', function(e) {
      if (e.which === 13) { // Enter key
        handlePostComment.call($(this).siblings('.post-comment-btn')[0]);
      }
    });
    $(document).on('click', '.share-btn', handleShareClick);
  
    // ========= Initial load =========
    showSkeletons();
    loadPosts().then((posts) => {
      // Combine server posts with local posts
      const localPosts = getLocalPosts();
      const allPosts = [...(posts || []), ...localPosts];
      
      // Sort newest to oldest
      allPosts.sort((a, b) => {
        const ta = new Date(a?.timestamp || 0).getTime();
        const tb = new Date(b?.timestamp || 0).getTime();
        return tb - ta;
      });
      
      window.__ALL_POSTS__ = allPosts;
      renderPosts(window.__ALL_POSTS__);
      
      if (localPosts.length > 0) {
        showInfo(`Showing ${posts?.length || 0} server posts and ${localPosts.length} local posts.`);
      }
      
      // Check if we need to scroll to a specific post (from search page)
      checkForPostScroll();
    }).catch((err) => {
      console.error('Load posts failed:', err);
      
      // Try to load local posts first
      const localPosts = getLocalPosts();
      if (localPosts.length > 0) {
        showError(`Server unavailable. Showing ${localPosts.length} local posts.`);
        window.__ALL_POSTS__ = localPosts;
        renderPosts(localPosts);
      } else {
        showError('Failed to load posts from server. Showing demo data.');
        const demo = getMockPosts();
        window.__ALL_POSTS__ = demo;
        renderPosts(demo);
      }
      
      // Check for post scroll even if loading failed
      checkForPostScroll();
    });
  });
  
  /* ---------------- Core ---------------- */
  
  async function loadPosts() {
    return new Promise((resolve, reject) => {
      $.ajax({
        url: getPostsEndpoint(),
        method: 'GET',
        dataType: 'json',
        success: function (response) {
          // Expected shape: { success: true, posts: [...] }
          if (!response || response.success !== true || !Array.isArray(response.posts)) {
            return reject(new Error('Unexpected response shape'));
          }
          // Sort newest → oldest by timestamp if present
          const sorted = [...response.posts].sort((a, b) => {
            const ta = new Date(a?.timestamp || 0).getTime();
            const tb = new Date(b?.timestamp || 0).getTime();
            return tb - ta;
          });
          resolve(sorted);
        },
        error: function (xhr) {
          reject(new Error(xhr?.responseText || 'Network error'));
        }
      });
    });
  }
  
  function renderPosts(posts) {
    const $feed = $('#feedPosts');
    $feed.empty();
  
    if (!posts || posts.length === 0) {
      $feed.html('<p style="color:#888;text-align:center;">No travel experiences yet. Be the first to share yours!</p>');
      return;
    }
  
    const frag = document.createDocumentFragment();
    posts.forEach((post) => {
      const html = createPostHTML(post);
      const wrapper = document.createElement('div');
      wrapper.innerHTML = html.trim();
      frag.appendChild(wrapper.firstChild);
    });
    $feed.append(frag);
    
    // Check like status for each post after rendering
    const userData = JSON.parse(localStorage.getItem('userData'));
    if (userData) {
      posts.forEach(post => {
        checkLikeStatus(post.id, userData.id);
      });
    }
  }
  
  function checkLikeStatus(postId, userId) {
    // Check if user has liked this post
    $.ajax({
      url: `/api/posts/${postId}/like/status?userId=${userId}`,
      method: 'GET',
      success: function(response) {
        if (response.success && response.isLiked) {
          const $likeBtn = $(`.like-btn[data-post-id="${postId}"]`);
          $likeBtn.data('liked', true);
          $likeBtn.find('i').removeClass('far fa-heart').addClass('fas fa-heart');
          $likeBtn.addClass('liked');
        }
      },
      error: function() {
        // Check local storage for like status
        const localLikes = JSON.parse(localStorage.getItem('localLikes')) || {};
        const postLikes = localLikes[postId] || [];
        const userData = JSON.parse(localStorage.getItem('userData'));
        if (userData && postLikes.includes(userData.username)) {
          const $likeBtn = $(`.like-btn[data-post-id="${postId}"]`);
          $likeBtn.data('liked', true);
          $likeBtn.find('i').removeClass('far fa-heart').addClass('fas fa-heart');
          $likeBtn.addClass('liked');
        }
      }
    });
  }
  
  /* ---------------- Rendering helpers ---------------- */
  
  function createPostHTML(post) {
    const userData = JSON.parse(localStorage.getItem('userData'));
    const currentUser = userData ? userData.username : '';
    const author = escapeHtml(post?.author || 'Unknown User');
    const ts = formatTime(post?.timestamp || '');
    const likes = post?.likes?.length || 0;
    const comments = post?.comments?.length || 0;
  
    // Two shapes supported:
    // 1) type === 'experience' with content = { placeName, country, safety, affordability, description, image }
    // 2) generic: content = { text, image }
    let contentHtml = '';
  
    if (post?.type === 'experience' && post?.content) {
      const c = post.content || {};
      // Build full location string with all available details
      const locationParts = [
        c.placeName,
        c.address,
        c.city,
        c.state,
        c.country
      ].filter(Boolean).map(escapeHtml);
      const place = locationParts.join(', ');
      const safety = isFinite(parseInt(c.safety)) ? getSafetyStars(parseInt(c.safety)) : '—';
      const affordability = isFinite(parseInt(c.affordability)) ? getAffordabilitySymbols(parseInt(c.affordability)) : '—';
      const desc = escapeHtml(c.description || '');
      const img = c.image ? `<img loading="lazy" src="${escapeAttr(c.image)}" alt="Travel photo" class="post-image">` : '';
  
      contentHtml = `
        <div class="post-text">
          <h4>${c.placeName || 'Untitled Experience'}</h4>
          <p class="post-location-detail"><i class="fas fa-map-marker-alt"></i> ${place}</p>
          <p><strong>Safety:</strong> ${safety}</p>
          <p><strong>Affordability:</strong> ${affordability}</p>
          ${desc ? `<p>${desc}</p>` : ''}
        </div>
        ${img}
      `;
    } else {
      const text = escapeHtml(post?.content?.text || '');
      const img = post?.content?.image ? `<img loading="lazy" src="${escapeAttr(post.content.image)}" alt="Post image" class="post-image">` : '';
      contentHtml = `
        <div class="post-text">${text || ''}</div>
        ${img}
      `;
    }
  
    // Add local post indicator
    const localIndicator = post?.isLocalPost ? 
      '<span style="background:#ffa500;color:#fff;padding:2px 6px;border-radius:4px;font-size:0.7em;margin-left:8px;">LOCAL</span>' : '';

    return `
      <article class="post-card">
        <header class="post-header">
          <div class="user-avatar-small" aria-hidden="true"><i class="fas fa-user-circle"></i></div>
          <div>
            <div class="post-author">
              <a href="#" class="author-link" onclick="viewUserProfile('${escapeAttr(author)}')">${author}</a>${localIndicator}
            </div>
            <time class="post-time" datetime="${escapeAttr(post?.timestamp || '')}">${ts}</time>
          </div>
        </header>
  
        <div class="post-content">
          ${contentHtml}
        </div>
  
        <footer class="post-footer">
          <div class="post-actions">
            <button class="action-btn like-btn" data-post-id="${escapeAttr(post?.id || '')}" data-liked="false">
              <i class="far fa-heart"></i> <span class="like-count">${likes}</span>
            </button>
            <button class="action-btn comment-btn" data-post-id="${escapeAttr(post?.id || '')}">
              <i class="far fa-comment"></i> <span class="comment-count">${comments}</span>
            </button>
            <button class="action-btn share-btn" data-post-id="${escapeAttr(post?.id || '')}">
              <i class="fas fa-share"></i> Share
            </button>
            ${author !== currentUser ? `<button class="action-btn profile-btn" onclick="viewUserProfile('${escapeAttr(author)}')">
              <i class="fas fa-user"></i> View Profile
            </button>` : ''}
          </div>
          <div class="comments-section" id="comments-${escapeAttr(post?.id || '')}" style="display: none;">
            <div class="comments-list"></div>
            <div class="add-comment">
              <input type="text" placeholder="Add a comment..." class="comment-input" data-post-id="${escapeAttr(post?.id || '')}">
              <button class="post-comment-btn" data-post-id="${escapeAttr(post?.id || '')}">Post</button>
            </div>
          </div>
        </footer>
      </article>
    `;
  }
  
  /* ---------------- UI helpers ---------------- */
  
  function showSkeletons(count = 4) {
    const $feed = $('#feedPosts');
    const items = Array.from({ length: count }).map(() => `
      <div class="post-card skeleton">
        <div class="post-header">
          <div class="user-avatar-small skeleton-block"></div>
          <div style="flex:1;">
            <div class="skeleton-line" style="width:140px;"></div>
            <div class="skeleton-line" style="width:90px;"></div>
          </div>
        </div>
        <div class="post-content">
          <div class="skeleton-line" style="width:80%;"></div>
          <div class="skeleton-line" style="width:95%;"></div>
          <div class="skeleton-line" style="width:70%;"></div>
          <div class="skeleton-img"></div>
        </div>
        <div class="post-stats">
          <div class="skeleton-line" style="width:60px;"></div>
          <div class="skeleton-line" style="width:80px;"></div>
        </div>
      </div>
    `).join('');
    $feed.html(items);
  }
  
  function showError(msg) {
    $('#feedPosts').prepend(
      `<p style="color:#b00020;background:#ffecec;border:1px solid #ffb3b3;padding:.5rem 1rem;border-radius:8px;margin-bottom:1rem;">${escapeHtml(msg)}</p>`
    );
  }
  
  function showInfo(msg) {
    $('#feedPosts').prepend(
      `<p style="color:#28a745;background:#e7f5e7;border:1px solid #b3e0b3;padding:.5rem 1rem;border-radius:8px;margin-bottom:1rem;">${escapeHtml(msg)}</p>`
    );
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      $('#feedPosts p:first-child').fadeOut(500, function() { $(this).remove(); });
    }, 5000);
  }
  
  function getLocalPosts() {
    try {
      const localPosts = JSON.parse(localStorage.getItem('localPosts')) || [];
      return localPosts.map(post => ({
        ...post,
        isLocalPost: true // Mark as local for UI indication
      }));
    } catch (error) {
      console.error('Error loading local posts:', error);
      return [];
    }
  }
  
  /* ---------------- Search ---------------- */
  
  function handleSearch() {
    const q = ($('.search-box input[type="text"]').val() || '').trim().toLowerCase();
    const all = window.__ALL_POSTS__ || [];
    if (!q) return renderPosts(all);
  
    const filtered = all.filter((p) => {
      const author = (p?.author || '').toLowerCase();
      const text = (p?.content?.text || '').toLowerCase();
      const place = (p?.content?.placeName || '').toLowerCase();
      const country = (p?.content?.country || '').toLowerCase();
      const desc = (p?.content?.description || '').toLowerCase();
  
      return [author, text, place, country, desc].some((v) => v.includes(q));
    });
  
    renderPosts(filtered);
  }
  
  /* ---------------- Formatters & utils ---------------- */
  
  function getSafetyStars(rating) {
    const r = clampInt(rating, 0, 5);
    const stars = '⭐'.repeat(r);
    const labels = ['—', 'Unsafe', 'Somewhat Unsafe', 'Moderate', 'Safe', 'Very Safe'];
    return `${stars} ${labels[r] || ''}`.trim();
  }
  
  function getAffordabilitySymbols(rating) {
    const r = clampInt(rating, 0, 5);
    const symbols = '💰'.repeat(r);
    const labels = ['—', 'Very Affordable', 'Affordable', 'Moderate', 'Expensive', 'Very Expensive'];
    return `${symbols} ${labels[r] || ''}`.trim();
  }
  
  function formatTime(timestamp) {
    const now = new Date();
    const postTime = new Date(timestamp);
    if (isNaN(postTime.getTime())) return '—';
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
  
  function clampInt(n, min, max) {
    const v = parseInt(n);
    if (isNaN(v)) return min;
    return Math.max(min, Math.min(max, v));
  }
  
  function safeParse(str) {
    try { return JSON.parse(str); } catch { return null; }
  }
  
  function escapeHtml(s) {
    return String(s)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
  
  function escapeAttr(s) {
    // Conservative for attributes/URLs
    return escapeHtml(s).replace(/[\n\r\t]/g, '');
  }
  
  function debounce(fn, ms) {
    let t = null;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }
  
  function getPostsEndpoint() {
    const API_BASE = (localStorage.getItem('apiBaseUrl') || '').replace(/\/$/, '');
    return API_BASE ? `${API_BASE}/api/posts` : '/api/posts';
  }
  
  // Check if we need to scroll to a specific post (from search page)
  function checkForPostScroll() {
    const scrollToPostId = localStorage.getItem('scrollToPost');
    if (scrollToPostId) {
      // Remove the scroll target
      localStorage.removeItem('scrollToPost');
      
      // Wait a bit for posts to render, then scroll
      setTimeout(() => {
        const postElement = $(`.post-card[data-post-id="${scrollToPostId}"]`);
        if (postElement.length) {
          postElement[0].scrollIntoView({ behavior: 'smooth' });
          postElement.addClass('highlighted-post');
          setTimeout(() => postElement.removeClass('highlighted-post'), 3000);
        }
      }, 500);
    }
  }
  
  /* ---------------- Mock (for front-end only dev) ---------------- */
  
  function getMockPosts() {
    // If your backend is not reachable during front-end dev,
    // we’ll show these so you can style the feed.
    return [
      {
        id: 'p3',
        author: 'Aisha Khan',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        type: 'experience',
        content: {
          placeName: 'Kathmandu',
          country: 'Nepal',
          safety: 4,
          affordability: 3,
          description: 'Thamel’s streets are buzzing! Loved Swayambhunath at sunset.',
          image: 'https://picsum.photos/seed/kathmandu/800/450'
        },
        likes: 12,
        comments: 3
      },
      {
        id: 'p2',
        author: 'Diego Rivera',
        timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
        type: 'experience',
        content: {
          placeName: 'Bali',
          country: 'Indonesia',
          safety: 5,
          affordability: 2,
          description: 'Canggu cafes + Uluwatu cliffs = perfection. Surf was mellow.',
          image: 'https://picsum.photos/seed/bali/800/450'
        },
        likes: 45,
        comments: 10
      },
      {
        id: 'p1',
        author: 'Jesse',
        timestamp: new Date(Date.now() - 2 * 86400000).toISOString(),
        content: {
          text: 'Quick tip: always carry a local eSIM backup.',
          image: ''
        },
        likes: 7,
        comments: 1
      }
    ];
  }
  
  /* ---------------- Like & Comment Handlers ---------------- */
  
  function handleLikeClick(e) {
    e.preventDefault();
    const $btn = $(this);
    const postId = $btn.data('post-id');
    const isLiked = $btn.data('liked') === true || $btn.data('liked') === 'true';
    const userData = JSON.parse(localStorage.getItem('userData'));
    
    if (!userData) {
      showError('Please log in to like posts');
      return;
    }
    
    // Optimistic UI update
    const $likeCount = $btn.find('.like-count');
    const currentCount = parseInt($likeCount.text()) || 0;
    
    if (isLiked) {
      // Unlike
      $btn.data('liked', false);
      $btn.find('i').removeClass('fas fa-heart').addClass('far fa-heart');
      $btn.removeClass('liked');
      $likeCount.text(Math.max(0, currentCount - 1));
    } else {
      // Like
      $btn.data('liked', true);
      $btn.find('i').removeClass('far fa-heart').addClass('fas fa-heart');
      $btn.addClass('liked');
      $likeCount.text(currentCount + 1);
    }
    
    // Send to server
    $.ajax({
      url: `/api/posts/${postId}/like`,
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ 
        userId: userData.id,
        username: userData.username,
        action: isLiked ? 'unlike' : 'like'
      }),
      success: function(response) {
        console.log('Like action successful:', response);
        if (response.success && response.likes !== undefined) {
          $likeCount.text(response.likes);
          
          // Add notification for the post author (if it's not the current user liking their own post)
          if (!isLiked) { // Only for new likes, not unlikes
            // Find the post to get author info
            const allPosts = [...(window.serverPosts || []), ...getLocalPosts()];
            const post = allPosts.find(p => p.id === postId);
            if (post && post.author !== userData.username) {
              addNotification('like', `${userData.username} liked your post`, postId);
            }
          }
        }
      },
      error: function(xhr, status, error) {
        console.error('Error updating like:', error);
        // Revert optimistic update on error
        if (isLiked) {
          $btn.data('liked', true);
          $btn.find('i').removeClass('far fa-heart').addClass('fas fa-heart');
          $btn.addClass('liked');
          $likeCount.text(currentCount);
        } else {
          $btn.data('liked', false);
          $btn.find('i').removeClass('fas fa-heart').addClass('far fa-heart');
          $btn.removeClass('liked');
          $likeCount.text(currentCount);
        }
        
        // Save like state locally if server fails
        saveLikeLocally(postId, !isLiked, userData.username);
      }
    });
  }
  
  function handleCommentToggle(e) {
    e.preventDefault();
    const postId = $(this).data('post-id');
    const $commentsSection = $(`#comments-${postId}`);
    
    if ($commentsSection.is(':visible')) {
      $commentsSection.slideUp(200);
    } else {
      $commentsSection.slideDown(200);
      loadComments(postId);
      // Focus on comment input
      setTimeout(() => {
        $commentsSection.find('.comment-input').focus();
      }, 250);
    }
  }
  
  function handlePostComment(e) {
    e.preventDefault();
    const $btn = $(this);
    const postId = $btn.data('post-id');
    const $input = $btn.siblings('.comment-input');
    const commentText = $input.val().trim();
    const userData = JSON.parse(localStorage.getItem('userData'));
    
    if (!userData) {
      showError('Please log in to comment');
      return;
    }
    
    if (!commentText) {
      showError('Please enter a comment');
      return;
    }
    
    // Disable input while posting
    $input.prop('disabled', true);
    $btn.prop('disabled', true).text('Posting...');
    
    const commentData = {
      postId: postId,
      userId: userData.id,
      username: userData.username,
      text: commentText,
      timestamp: new Date().toISOString()
    };
    
    $.ajax({
      url: `/api/posts/${postId}/comment`,
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        comment: commentText,
        author: userData.username
      }),
      success: function(response) {
        console.log('Comment posted successfully:', response);
        $input.val(''); // Clear input
        loadComments(postId); // Reload comments
        
        // Update comment count
        const $commentBtn = $(`.comment-btn[data-post-id="${postId}"]`);
        const $commentCount = $commentBtn.find('.comment-count');
        const currentCount = parseInt($commentCount.text()) || 0;
        $commentCount.text(currentCount + 1);
        
        // Add notification for the post author (if it's not the current user commenting on their own post)
        const allPosts = [...(window.serverPosts || []), ...getLocalPosts()];
        const post = allPosts.find(p => p.id === postId);
        if (post && post.author !== userData.username) {
          const truncatedComment = commentText.length > 50 ? commentText.substring(0, 50) + '...' : commentText;
          addNotification('comment', `${userData.username} commented: "${truncatedComment}"`, postId);
        }
      },
      error: function(xhr, status, error) {
        console.error('Error posting comment:', error);
        
        // Save comment locally if server fails
        saveCommentLocally(postId, commentData);
        $input.val(''); // Clear input
        loadComments(postId); // Reload to show local comment
        
        showInfo('Comment saved locally (server unavailable)');
      },
      complete: function() {
        $input.prop('disabled', false);
        $btn.prop('disabled', false).text('Post');
      }
    });
  }
  
  function handleShareClick(e) {
    e.preventDefault();
    const postId = $(this).data('post-id');
    
    // Simple share functionality - copy link to clipboard
    const shareUrl = `${window.location.origin}${window.location.pathname}?post=${postId}`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        showInfo('Post link copied to clipboard!');
      }).catch(() => {
        fallbackCopyToClipboard(shareUrl);
      });
    } else {
      fallbackCopyToClipboard(shareUrl);
    }
  }
  
  function loadComments(postId) {
    const $commentsList = $(`#comments-${postId} .comments-list`);
    $commentsList.html('<div style="text-align:center;padding:10px;color:#888;">Loading comments...</div>');
    
    $.ajax({
      url: `/api/posts/${postId}/comment`,
      method: 'GET',
      success: function(response) {
        if (response.success && response.comments) {
          displayComments(postId, response.comments);
        } else {
          $commentsList.html('<div style="text-align:center;padding:10px;color:#888;">No comments yet</div>');
        }
      },
      error: function() {
        // Load local comments if server fails
        const localComments = getLocalComments(postId);
        if (localComments.length > 0) {
          displayComments(postId, localComments);
        } else {
          $commentsList.html('<div style="text-align:center;padding:10px;color:#888;">No comments yet</div>');
        }
      }
    });
  }
  
  function displayComments(postId, comments) {
    const $commentsList = $(`#comments-${postId} .comments-list`);
    
    if (!comments || comments.length === 0) {
      $commentsList.html('<div style="text-align:center;padding:10px;color:#888;">No comments yet</div>');
      return;
    }
    
    const commentsHtml = comments.map(comment => {
      const localBadge = comment.isLocal ? '<span style="background:#ffa500;color:#fff;padding:1px 4px;border-radius:3px;font-size:0.6em;margin-left:5px;">LOCAL</span>' : '';
      const commentText = comment.comment || comment.text || '';
      const commentAuthor = comment.author || comment.username || 'Anonymous';
      return `
        <div class="comment-item">
          <strong>${escapeHtml(commentAuthor)}${localBadge}</strong>
          <span class="comment-time">${formatTime(comment.timestamp)}</span>
          <div class="comment-text">${escapeHtml(commentText)}</div>
        </div>
      `;
    }).join('');
    
    $commentsList.html(commentsHtml);
  }
  
  function saveLikeLocally(postId, isLiked, username) {
    try {
      let localLikes = JSON.parse(localStorage.getItem('localLikes')) || {};
      if (!localLikes[postId]) localLikes[postId] = [];
      
      if (isLiked) {
        if (!localLikes[postId].includes(username)) {
          localLikes[postId].push(username);
        }
      } else {
        localLikes[postId] = localLikes[postId].filter(u => u !== username);
      }
      
      localStorage.setItem('localLikes', JSON.stringify(localLikes));
    } catch (error) {
      console.error('Error saving like locally:', error);
    }
  }
  
  function saveCommentLocally(postId, commentData) {
    try {
      let localComments = JSON.parse(localStorage.getItem('localComments')) || {};
      if (!localComments[postId]) localComments[postId] = [];
      
      commentData.isLocal = true;
      localComments[postId].push(commentData);
      
      localStorage.setItem('localComments', JSON.stringify(localComments));
    } catch (error) {
      console.error('Error saving comment locally:', error);
    }
  }
  
  function getLocalComments(postId) {
    try {
      const localComments = JSON.parse(localStorage.getItem('localComments')) || {};
      return localComments[postId] || [];
    } catch (error) {
      console.error('Error loading local comments:', error);
      return [];
    }
  }
  
  function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      showInfo('Post link copied to clipboard!');
    } catch (err) {
      showError('Could not copy link. Please copy manually: ' + text);
    }
    document.body.removeChild(textArea);
  }
  
  // Real notification system
  function showNotifications() {
    const notifications = getNotifications();
    
    if (notifications.length === 0) {
      // Show empty state
      const notificationHtml = `
        <div class="notification-overlay" id="notificationOverlay">
          <div class="notification-popup">
            <div class="notification-header">
              <h3>Notifications</h3>
              <button class="close-notifications" onclick="closeNotifications()">&times;</button>
            </div>
            <div class="notification-list">
              <div class="no-notifications">
                <i class="fas fa-bell-slash"></i>
                <p>No notifications yet</p>
                <span>You'll see notifications here when people interact with your posts</span>
              </div>
            </div>
          </div>
        </div>
      `;
      
      $('body').append(notificationHtml);
      $('#notificationOverlay').fadeIn(300);
      return;
    }
    
    // Create notification popup with real data
    const notificationHtml = `
      <div class="notification-overlay" id="notificationOverlay">
        <div class="notification-popup">
          <div class="notification-header">
            <h3>Notifications</h3>
            <button class="close-notifications" onclick="closeNotifications()">&times;</button>
          </div>
          <div class="notification-list">
            ${notifications.map(notif => `
              <div class="notification-item ${notif.read ? 'read' : 'unread'}">
                <div class="notification-icon">
                  <i class="fas ${getNotificationIcon(notif.type)}"></i>
                </div>
                <div class="notification-content">
                  <p>${notif.message}</p>
                  <span class="notification-time">${getTimeAgo(notif.timestamp)}</span>
                </div>
              </div>
            `).join('')}
          </div>
          <div class="notification-footer">
            <button class="btn-mark-all-read" onclick="markAllAsRead()">Mark all as read</button>
          </div>
        </div>
      </div>
    `;
    
    $('body').append(notificationHtml);
    $('#notificationOverlay').fadeIn(300);
  }
  
  // Get real notifications from localStorage
  function getNotifications() {
    try {
      const notifications = JSON.parse(localStorage.getItem('userNotifications')) || [];
      return notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (error) {
      console.error('Error loading notifications:', error);
      return [];
    }
  }
  
  // Add notification when someone interacts
  function addNotification(type, message, postId = null) {
    const userData = JSON.parse(localStorage.getItem('userData'));
    if (!userData) return;
    
    const notification = {
      id: Date.now() + Math.random(),
      type: type,
      message: message,
      timestamp: new Date().toISOString(),
      postId: postId,
      read: false,
      userId: userData.id
    };
    
    const notifications = getNotifications();
    notifications.unshift(notification);
    
    // Keep only last 50 notifications
    if (notifications.length > 50) {
      notifications.splice(50);
    }
    
    localStorage.setItem('userNotifications', JSON.stringify(notifications));
    updateNotificationBadge();
  }
  
  // Update notification badge count
  function updateNotificationBadge() {
    const notifications = getNotifications();
    const unreadCount = notifications.filter(n => !n.read).length;
    
    const badge = $('#notificationBadge');
    if (unreadCount > 0) {
      badge.text(unreadCount).show();
    } else {
      badge.hide();
    }
  }
  
  // Convert timestamp to "time ago" format
  function getTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now - time) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return time.toLocaleDateString();
  }
  
  function closeNotifications() {
    $('#notificationOverlay').fadeOut(300, function() {
      $(this).remove();
    });
  }
  
  function getNotificationIcon(type) {
    switch(type) {
      case 'like': return 'fa-heart';
      case 'comment': return 'fa-comment';
      case 'follow': return 'fa-user-plus';
      default: return 'fa-bell';
    }
  }
  
  function markAllAsRead() {
    const notifications = getNotifications();
    notifications.forEach(notification => {
      notification.read = true;
    });
    localStorage.setItem('userNotifications', JSON.stringify(notifications));
    $('.notification-item').removeClass('unread').addClass('read');
    updateNotificationBadge();
  }
  
  // Global function to view user profile
  function viewUserProfile(username) {
    console.log('viewUserProfile called with username:', username);
    // Navigate to profile page with the target username
    localStorage.setItem('viewProfileFor', username);
    console.log('Set viewProfileFor in localStorage:', username);
    window.location.href = 'profile.html';
  }
  

  