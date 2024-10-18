// Get the CSRF token from the cookie
var csrftoken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
var pass_profile = "";

function user_sign_out() {
    if (pass_profile == 'now') {
        window.location.reload();
    } else {
        var formData = new FormData();
        formData.append("signout", "signout");
        $.ajax({
            type: 'POST',
            url: '/signout/',
            data: formData,
            dataType: 'json',
            contentType: false,
            processData: false,
            headers: {
              'X-CSRFToken': csrftoken
            },
            success: function(response) {
                if (response.message === '200') {
                    window.location.href = "/auth";
                } else {
                    console.log("Failed!");
                }
            },
            error: function(xhr, status, error) {
                console.log(error);
            }
        });
    }
}

// sign user out
document.addEventListener('click', e => {
    const clickedElement = e.target;
    if (clickedElement.matches('#sign_out_btn')) {
        e.preventDefault();
        user_sign_out();
    }
});


$(window).on('beforeunload', function() {
    // $('#sign_out_btn').click();
    // return "Are you sure you want to leave this page?";
});

$("#pass_button").click(function (e) { pass_profile = 'now'; });


