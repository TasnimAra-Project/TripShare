let addressVerified = false;

function clearHidden() {
  $('#lat,#lng,#city,#state,#postalCode,#formattedAddress').val('');
}

// Display in-page notification
function showNotification(message, type = 'success') {
  let notification = $('#notification');
  if (!notification.length) {
    $('body').append('<div id="notification" style="position: fixed; top: 20px; right: 20px; padding: 15px 25px; border-radius: 8px; font-weight: bold; color: #fff; z-index: 1000;"></div>');
    notification = $('#notification');
  }
  notification.text(message).css({
    backgroundColor: type === 'success' ? '#28a745' : '#dc3545'
  }).fadeIn(400).delay(2000).fadeOut(400);
}

// Google Places Autocomplete
window.initPlaces = function initPlaces() {
  const input = document.getElementById('address');
  if (!input) return;

  const ac = new google.maps.places.Autocomplete(input, {
    fields: ['address_components', 'geometry', 'formatted_address'],
    componentRestrictions: { country: ['us'] }
  });

  ac.addListener('place_changed', () => {
    const place = ac.getPlace();
    const statusEl = $('#addrStatus');
    addressVerified = false;

    if (!place || !place.geometry || !place.address_components) {
      statusEl.text('Please select a suggestion to verify the address.');
      clearHidden();
      return;
    }

    const comps = place.address_components;
    const get = (type) => (comps.find(c => c.types.includes(type)) || {}).long_name || '';
    const getShort = (type) => (comps.find(c => c.types.includes(type)) || {}).short_name || '';

    const streetNumber = get('street_number');
    const route = get('route');
    const city  = get('locality') || get('sublocality') || get('postal_town');
    const state = getShort('administrative_area_level_1');
    const country = get('country');
    const zip   = get('postal_code');

    if (!state || !city || !country) {
      statusEl.text('Please enter a complete address with city, state, and country.');
    } else {
      statusEl.text('Address verified ✓');
      addressVerified = true;
    }

    $('#address').val([streetNumber, route].filter(Boolean).join(' '));
    $('#city').val(city);
    $('#state').val(state);
    $('#country').val(country);
    $('#lat').val(place.geometry.location.lat());
    $('#lng').val(place.geometry.location.lng());
    $('#postalCode').val(zip);
    $('#formattedAddress').val(place.formatted_address);
  });
};

$(document).ready(function () {
  // Back to feed button
  $('#backToFeedBtn').on('click', function () {
    window.location.href = 'feed.html';
  });

  // Image preview
  $('#imageUpload').on('change', function (e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (ev) {
        $('#imagePreview').html('<img src="' + ev.target.result + '" alt="Preview" style="max-width:100%;border-radius:8px;">');
      };
      reader.readAsDataURL(file);
    } else {
      $('#imagePreview').empty();
    }
  });

  // Form submit
  $('#experienceForm').on('submit', function (e) {
    e.preventDefault();

    console.log("Form submit triggered");

    const userData = JSON.parse(localStorage.getItem('userData'));
    if (!userData) {
      window.location.href = 'Login.html';
      return;
    }

    const placeName = $('#placeName').val();
    const safety = $('#safety').val();
    const affordability = $('#affordability').val();
    const description = $('#experienceDescription').val();
    const address = $('#address').val();
    const city = $('#city').val();
    const state = $('#state').val();
    const country = $('#country').val();
    const postalCode = $('#postalCode').val();
    const lat = $('#lat').val();
    const lng = $('#lng').val();

    if (!placeName || !safety || !affordability || !description || !address || !city || !state || !country) {
      showNotification('Please fill in all required fields.', 'error');
      return;
    }

    if (!addressVerified) {
      $('#addrStatus').text('Please pick a valid address from the list to verify.');
      $('#address').focus();
      return;
    }

    const imageFile = $('#imageUpload')[0].files[0];

    const formData = new FormData();
    formData.append('user_id', userData.id);
    formData.append('placeName', placeName);
    formData.append('address', address);
    formData.append('city', city);
    formData.append('state', state);
    formData.append('country', country);
    formData.append('postalCode', postalCode);
    formData.append('lat', lat);
    formData.append('lng', lng);
    formData.append('safety', safety);
    formData.append('affordability', affordability);
    formData.append('description', description);
    if (imageFile) {
      formData.append('image', imageFile);
    }

    $.ajax({
      url: '/api/posts',
      method: 'POST',
      data: formData,
      processData: false,
      contentType: false,
      success: function (response) {
        if (response.success && response.post) {
          // Show modern in-page notification
          const postName = response.post.place_name || '';
          showNotification(`Experience shared! You added: ${postName}`, 'success');

          // Redirect after short delay so user sees notification
          setTimeout(() => {
            window.location.href = 'feed.html';
          }, 1500);
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
