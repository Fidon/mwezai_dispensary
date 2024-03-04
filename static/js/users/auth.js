$(document).ready(function() {
    // Check if entire string is alphabets
    function onlyAlphabets(str) {
        const regex = /^[a-zA-Z'-]+$/;
        return regex.test(str);
    }
    
    // Get the CSRF token
    var csrftoken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

    // Add new user
    $('#loginForm').submit(function(event) {
        event.preventDefault();
        var uname = $.trim($("#usname").val());
        var pass = $.trim($("#passwd").val());

        if(onlyAlphabets(uname)) {
            var formData = new FormData();
            formData.append("username", uname);
            formData.append("password", pass);
            $.ajax({
                type: 'POST',
                url: $(this).attr('action'),
                data: formData,
                dataType: 'json',
                contentType: false,
                processData: false,
                headers: {
                    'X-CSRFToken': csrftoken
                },
                beforeSend: function() {
                    $("#authBtn").html("<i class='fas fa-spinner fa-pulse'></i>");
                    $("#authBtn").attr('type','button');
                },
                success: function(response) {
                    if(response.success) {
                        window.location.href = response.page;
                    } else {
                        $("#authBtn").text("Login");
                        $("#authBtn").attr('type','submit');
                        $("#auth_formsms").html("<span class='py-2 alert alert-danger'><i class='fas fa-exclamation-circle'></i> "+response.sms+"</span>").slideDown('fast').delay(3000).slideUp('fast');
                    }
                },
                error: function(xhr, status, error) {
                    console.log(error);
                }
            });
        } else {
            $("#auth_formsms").html("<span class='py-2 alert alert-danger'><i class='fas fa-exclamation-circle'></i> Invalid username input!</span>").slideDown('fast').delay(3000).slideUp('fast');
            $("#usname").focus();
        }
    });
});
