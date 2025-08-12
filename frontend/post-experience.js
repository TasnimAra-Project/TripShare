let addressVerified = false;

function clearHidden() {
  $('#lat,#lng,#city,#state,#postalCode,#formattedAddress').val('');
}

// Expose for Google callback
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

    const city  = get('locality') || get('sublocality') || get('postal_town');
    const state = getShort('administrative_area_level_1');
    const zip   = get('postal_code');

    if (!state || !zip) {
      statusEl.text('Enter a full U.S. address that includes a ZIP code.');
    } else {
      statusEl.text('Address verified ✓');
      addressVerified = true;
    }

    $('#lat').val(place.geometry.location.lat());
    $('#lng').val(place.geometry.location.lng());
    $('#city').val(city);
    $('#state').val(state);
    $('#postalCode').val(zip);
    $('#formattedAddress').val(place.formatted_address);
  });
};

$(document).ready(function () {
  // Back to feed
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

    const userData = JSON.parse(localStorage.getItem('userData'));
    if (!userData) {
      window.location.href = 'Login.html';
      return;
    }

    // Basic required checks
    const placeName = $('#placeName').val();
    const safety = $('#safety').val();
    const affordability = $('#affordability').val();
    const description = $('#experienceDescription').val();

    if (!placeName || !safety || !affordability || !description) {
      alert('Please fill in all required fields.');
      return;
    }

    if (!addressVerified) {
      $('#addrStatus').text('Please pick a valid address from the list to verify.');
      $('#address').focus();
      return;
    }

    const post = {
      type: 'experience',
      author: userData.username,
      content: {
        placeName,
        location: {
          formatted: $('#formattedAddress').val(),
          city: $('#city').val(),
          state: $('#state').val(),
          postalCode: $('#postalCode').val(),
          lat: parseFloat($('#lat').val()),
          lng: parseFloat($('#lng').val())
        },
        safety,
        affordability,
        description,
        image: $('#imagePreview img').attr('src') || null
      }
    };

    // Post to backend
    $.ajax({
      url: '/api/posts',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(post),
      success: function (response) {
        if (response.success) {
          window.location.href = 'feed.html';
        } else {
          alert('Failed to share experience. Please try again.');
        }
      },
      error: function () {
        alert('Failed to share experience. Please try again.');
      }
    });
  });
});
