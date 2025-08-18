function formatAddress() {
  const street  = $('#address').val().trim();
  const city    = $('#city').val().trim();
  const state   = $('#state').val().trim();
  const country = $('#country').val().trim();

  if (street && city && state && country) {
    const formatted = `${street}, ${city}, ${state}, ${country}`;
    $('#formattedAddress').val(formatted);
    $('#addrStatus').text('Using typed address ✓');
    return formatted;
  } else {
    $('#formattedAddress').val('');
    $('#addrStatus').text('Enter street, city, state, and country.');
    return '';
  }
}

// In-page notification
function showNotification(message, type = 'success') {
  let $n = $('#notification');
  if (!$n.length) {
    $('body').append('<div id="notification" style="position:fixed;top:20px;right:20px;padding:15px 25px;border-radius:8px;font-weight:bold;color:#fff;z-index:1000;display:none;"></div>');
    $n = $('#notification');
  }
  $n.text(message)
    .css('backgroundColor', type === 'success' ? '#28a745' : '#dc3545')
    .fadeIn(200).delay(1800).fadeOut(300);
}

$(document).ready(function () {
  // Back to feed
  $('#backToFeedBtn').on('click', () => window.location.href = 'feed.html');

  // Build formattedAddress as the user types
  $('#address,#city,#state,#country').on('input blur', formatAddress);

  // Image preview
  $('#imageUpload').on('change', function (e) {
    const file = e.target.files[0];
    if (!file) return $('#imagePreview').empty();
    const reader = new FileReader();
    reader.onload = (ev) => {
      $('#imagePreview').html(`<img src="${ev.target.result}" alt="Preview" style="max-width:100%;border-radius:8px;">`);
    };
    reader.readAsDataURL(file);
  });

  // Submit
  $('#experienceForm').on('submit', function (e) {
    e.preventDefault();

    const userData = JSON.parse(localStorage.getItem('userData'));
    if (!userData) {
      window.location.href = 'Login.html';
      return;
    }

    const placeName     = $('#placeName').val().trim();
    const safety        = $('#safety').val();
    const affordability = $('#affordability').val();
    const description   = $('#experienceDescription').val().trim();
    const street        = $('#address').val().trim();
    const city          = $('#city').val().trim();
    const state         = $('#state').val().trim();
    const country       = $('#country').val().trim();

    // Required checks
    if (!placeName || !safety || !affordability || !description || !street || !city || !state || !country) {
      showNotification('Please fill in all required fields.', 'error');
      formatAddress();
      return;
    }

    const formatted = formatAddress();
    if (!formatted) {
      showNotification('Enter a complete address (street, city, state, country).', 'error');
      return;
    }

    const imageFile = $('#imageUpload')[0].files[0];
    const formData = new FormData();
    formData.append('user_id', userData.id);
    formData.append('placeName', placeName);
    formData.append('address', street);
    formData.append('city', city);
    formData.append('state', state);
    formData.append('country', country);
    formData.append('formattedAddress', formatted);
    formData.append('safety', safety);
    formData.append('affordability', affordability);
    formData.append('description', description);
    if (imageFile) formData.append('image', imageFile);

    $.ajax({
      url: '/api/posts',
      method: 'POST',
      data: formData,
      processData: false,
      contentType: false,
      success: function (response) {
        if (response?.success && response?.post) {
          const postName = response.post.place_name || placeName || '';
          showNotification(`Experience shared! You added: ${postName}`, 'success');
          setTimeout(() => window.location.href = 'feed.html', 1200);
        } else {
          showNotification('Failed to share experience. Please try again.', 'error');
        }
      },
      error: function () {
        showNotification('Failed to share experience. Please try again.', 'error');
      }
    });
  });
});
