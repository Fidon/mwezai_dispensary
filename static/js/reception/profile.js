// Get the CSRF token
var csrftoken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

// validate file number input
function pass_length(input) {
    const pattern = /^.{6,32}$/;
    if (!pattern.test(input.value)) {
      input.setCustomValidity("Password should be 6-32 long");
    } else {
      input.setCustomValidity('');
    }
}

// change password
$("#profile_form").submit(function (e) { 
    e.preventDefault();
    var currentpass = $("#pass_current").val();
    var newpass = $("#pass_newpass").val();
    var confirmpass = $("#pass_confirm").val();
    if (newpass === confirmpass) {
        var formData = new FormData();
        formData.append("currentpass", currentpass);
        formData.append("newpass", newpass);
        $.ajax({
            type: 'POST',
            url: "/profile/update-password/",
            data: formData,
            dataType: 'json',
            contentType: false,
            processData: false,
            headers: {
                'X-CSRFToken': csrftoken
            },
            beforeSend: function() {
                $("#pass_button").html("<i class='fas fa-spinner fa-pulse'></i>");
                $("#pass_button").attr("type", "button");
            },
            success: function(response) {
                $("#pass_button").html("Update");
                $("#pass_button").attr("type", "submit");
                if (response.success) {
                    $("#profile_form")[0].reset();
                    $("#passFormSms").html("<span class='d-block w-100 alert alert-success m-0 mb-1 p-2'><i class='fas fa-check-circle'></i> "+response.sms+"</span>");
                } else {
                    $("#passFormSms").html("<span class='d-block w-100 alert alert-danger m-0 mb-1 p-2'><i class='fas fa-check-circle'></i> "+response.sms+"</span>");
                }
                $("#passFormSms").fadeIn('fast').delay(4000).fadeOut('fast');
            },
            error: function(xhr, status, error) {
                console.log(error);
            }
        });
    } else {
        $(".err", $("#pass_confirm").parent()).fadeIn('fast').delay(4000).fadeOut('fast');
    }
});