$(document).ready(function () {
    // Ininitialize all popovers in the page/doc
    var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'))
    var popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl)
    })


    // Initialize Bootstrap tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl)
    })
});

// Dropdown menu (navbar) function
function drop_menu(el, ev) {
    ev.preventDefault();
    var parent = $(el).parent();
    if($("i:nth-child(2)", el).css("display") == "none"){
        $("i:nth-child(3)", el).css("display","none");
        $("i:nth-child(2)", el).fadeIn('fast');
    } else {
        $("i:nth-child(2)", el).css("display","none");
        $("i:nth-child(3)", el).fadeIn('fast');
    }
    $(".dp_menu", parent).slideToggle('fast');
}

// display offcanvas navbar menu
$("#main header .divuser span.menu").click(function (e) { 
    e.preventDefault();
    var canva_html = $('#menuCanvas .offcanvas-body');
    if(canva_html.html().length == 0) {
        canva_html.html($("#navbar").html());
    }
    var link = "";
    $("div.link","#navbar").each(function () {
        if ($("a",this).css("color") == "rgb(21, 67, 96)") {
            link = $("a",this).attr('class')
        }
    });
    $("#menuCanvas .menu_div div.link a."+link).css({'background-color': '#F0F0F0','color': '#154360'});
    $('#menuCanvas').offcanvas('show');
});

// Get the CSRF token from the cookie
var csrftoken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

// Check if entire string is alphabets
function only_alphas(str) {
    const regex = /^[a-zA-Z]+$/;
    return regex.test(str);
}

// capitalize the first letter
function cap_str(str) {
    var txt = str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    return txt;
}

// check if price value is valid
function val_price(input) {
    const pattern = /^\d+(\.\d+)?$/;
    if (!pattern.test(input.value)) {
        input.setCustomValidity('Only numerical values are allowed!');
    } else {
        input.setCustomValidity('');
    }
}

// check if qty value is valid
function val_qty(input) {
    const pattern = /^\d+$/;
    if (!pattern.test(input.value)) {
        input.setCustomValidity('Only numerical values without decimals are allowed!');
    } else {
        input.setCustomValidity('');
    }
}

// check the validity of the phone number
function val_phone(input) {
    const pattern = /^(\d{10})?$/;
    if (!pattern.test(input.value)) {
        input.setCustomValidity('Please enter a 10-digit number or leave it blank.');
    } else {
        input.setCustomValidity('');
    }
}

// number to string with commas
function num_str(number) {
    return number.toLocaleString('en-US');
}

var new_item_forms = ["newLabTestForm", "newProcedureForm", "newUltraForm"];

// add new department service/item
$('#container form').submit(function(e) {
    e.preventDefault();
    var this_id = $(this).attr('id');
    if(new_item_forms.includes(this_id)) {
        var form_id = "#"+$(this).attr('id');
        var form_sms = "#"+$(".formsms", this).attr('id');
        var names = $.trim($("input[name='names']", this).val());
        var price = $.trim($("input[name='price']", this).val());
        var describe = $.trim($("textarea[name='describe']", this).val());

        var formData = new FormData();
        formData.append("dept", $("input[name='dept_id']", this).val());
        formData.append("name", names);
        formData.append("price", price);
        formData.append("describe", describe);

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
                $("#new_item_btn").html("<i class='fas fa-spinner fa-pulse'></i>");
                $("#new_item_btn").attr('type','button');
            },
            success: function(response) {
                $("#new_item_btn").text("Add");
                $("#new_item_btn").attr('type','submit');
                $('html, body, '+form_id).animate({ scrollTop: 0 }, 'slow');
                if(response.success) {
                    $(form_sms).html("<span class='py-2 alert alert-success'><i class='fas fa-check-circle'></i> "+response.sms+"</span>").slideDown('fast').delay(3000).slideUp('fast');
                    $(form_id)[0].reset();
                    $("#container table").load(location.href+" #container table");
                } else {
                    $(form_sms).html("<span class='py-2 alert alert-danger'><i class='fas fa-exclamation-circle'></i> "+response.sms+"</span>").slideDown('fast').delay(3000).slideUp('fast');
                }
            },
            error: function(xhr, status, error) {
                console.log(error);
            }
        });
    } else {
        update_dept_item(this_id);
    }
});

// update department service/items
function update_dept_item(form_id) {
    if (form_id == "updateItemForm") {
        var form = $('#'+form_id);
        var form_sms = "#"+$(".formsms", form).attr('id');
        var formData = new FormData();
        formData.append("dept", "it_update");
        formData.append("id", $("#up_item_id").val());
        formData.append("name", $.trim($("#up_name").val()));
        formData.append("price", $("#up_price").val());
        formData.append("describe", $.trim($("#up_describe").val()));

        $.ajax({
            type: 'POST',
            url: form.attr('action'),
            data: formData,
            dataType: 'json',
            contentType: false,
            processData: false,
            headers: {
                'X-CSRFToken': csrftoken
            },
            beforeSend: function() {
                $("#btn_update_item").html("<i class='fas fa-spinner fa-pulse'></i>");
                $("#btn_update_item").attr('type','button');
            },
            success: function(response) {
                $("#btn_update_item").html("Update");
                $("#btn_update_item").attr('type','submit');
                $('html, body, #'+form_id).animate({ scrollTop: 0 }, 'slow');
                if(response.success) {
                    $(form_sms).html("<span class='py-2 alert alert-success'><i class='fas fa-check-circle'></i> "+response.sms+"</span>").slideDown('fast').delay(3000).slideUp('fast');
                    $("#item_info").load(location.href+" #item_info");
                    $("#bold_itemName").load(location.href+" #bold_itemName");
                } else {
                    $(form_sms).html("<span class='py-2 alert alert-danger'><i class='fas fa-exclamation-circle'></i> "+response.sms+"</span>").slideDown('fast').delay(3000).slideUp('fast');
                }
            },
            error: function(xhr, status, error) {
                console.log(error);
            }
        });
    } else {
        update_user_info(form_id);
    }
}

// update user details
function update_user_info(form_id) {
    if (form_id == "edit_user_form") {
        var form = $('#'+form_id);
        var form_sms = $(".formsms", form);
        var formData = new FormData();
        var username = $.trim($("#ed_username").val());
        var fullname = $.trim($("#ed_fullname").val());
        var gender = $("#ed_gender").val();
        var phone = $("#ed_phone").val();
        var describe = $.trim($("#ed_describe").val());
        var department = $("#ed_department").val();
        var names = fullname.split(" ");

        if(only_alphas(username)) {
            if((username.length >= 3) && (username.length <= 32)) {
                if(names.length >= 2) {
                    formData.append("dept", "users");
                    formData.append("user_id", $("#user_id_input").val());
                    formData.append("username", cap_str(username));
                    formData.append("fullname", fullname);
                    formData.append("gender", gender);
                    formData.append("department", department);
                    formData.append("describe", describe);
                    formData.append("phone", phone);

                    $.ajax({
                        type: 'POST',
                        url: form.attr('action'),
                        data: formData,
                        dataType: 'json',
                        contentType: false,
                        processData: false,
                        headers: {
                            'X-CSRFToken': csrftoken
                        },
                        beforeSend: function() {
                            $("#btn_update_item").html("<i class='fas fa-spinner fa-pulse'></i>");
                            $("#btn_update_item").attr('type','button');
                        },
                        success: function(response) {
                            $("#btn_update_item").html("Update");
                            $("#btn_update_item").attr('type','submit');
                            $('html, body, #'+form_id).animate({ scrollTop: 0 }, 'slow');
                            if(response.success) {
                                $(form_sms).html("<span class='py-2 alert alert-success'><i class='fas fa-check-circle'></i> "+response.sms+"</span>").slideDown('fast').delay(3000).slideUp('fast');
                                $("#user_info").load(location.href+" #user_info");
                                $("#bold_reset").text(nameful);
                                $("#bold_delete").text(nameful);
                            } else {
                                $(form_sms).html("<span class='py-2 alert alert-danger'><i class='fas fa-exclamation-circle'></i> "+response.sms+"</span>").slideDown('fast').delay(3000).slideUp('fast');
                            }
                        },
                        error: function(xhr, status, error) {
                            console.log(error);
                        }
                    });
                } else {
                    $("#errFullname").html("<i class='fas exclamation-circle'></i> Enter atleast 2 names separated by single space are allowed.").slideDown('fast').delay(3000).slideUp('fast');
                    $("#ed_fullname").focus();
                }
            } else {
                $("#errUsername").html("<i class='fas exclamation-circle'></i> Only 3 to 15 characters are allowed.").slideDown('fast').delay(3000).slideUp('fast');
                $("#ed_username").focus();
            }
        } else {
            $("#errUsername").html("<i class='fas fa-exclamation-circle'></i> Only alphabets are allowed.").slideDown('fast').delay(3000).slideUp('fast');
            $("#ed_username").focus();
        }
    }
}

document.addEventListener('click', e => {
    // delete this particular service
    if (e.target.closest('#item_del_btn')) {
        e.preventDefault();
        var formData = new FormData();
        formData.append("dept", "it_delete");
        formData.append("id", $("#up_item_id").val());
        $.ajax({
            type: 'POST',
            url: $("#updateItemForm").attr('action'),
            data: formData,
            dataType: 'json',
            contentType: false,
            processData: false,
            headers: {
                'X-CSRFToken': csrftoken
            },
            beforeSend: function() {
                $("#item_del_btn").html("<i class='fas fa-spinner fa-pulse'></i>");
            },
            success: function(response) {
                if(response.success) {
                    window.history.back();
                }
            },
            error: function(xhr, status, error) {
                console.log(error);
            }
        });

    // hide this particular service
    } else if (e.target.closest('#hide_item_btn')) {
        e.preventDefault();
        var formData = new FormData();
        formData.append("dept", "it_hide");
        formData.append("id", $("#up_item_id").val());
        $.ajax({
            type: 'POST',
            url: $("#updateItemForm").attr('action'),
            data: formData,
            dataType: 'json',
            contentType: false,
            processData: false,
            headers: {
                'X-CSRFToken': csrftoken
            },
            beforeSend: function() {
                $("#hide_item_btn").html("<i class='fas fa-spinner fa-pulse'></i>");
            },
            success: function(response) {
                $("#item_info").load(location.href+" #item_info");
            },
            error: function(xhr, status, error) {
                console.log(error);
            }
        });

    // block this user account
    } else if (e.target.closest('#block_user_btn')) {
        e.preventDefault();
        var formData = new FormData();
        formData.append("dept", "account_block");
        formData.append("user", $("#user_id_input").val());
        $.ajax({
            type: 'POST',
            url: $("#edit_user_form").attr('action'),
            data: formData,
            dataType: 'json',
            contentType: false,
            processData: false,
            headers: {
                'X-CSRFToken': csrftoken
            },
            beforeSend: function() {
                $("#block_user_btn").html("<i class='fas fa-spinner fa-pulse'></i>");
            },
            success: function(response) {
                $("#user_info").load(location.href+" #user_info");
            },
            error: function(xhr, status, error) {
                console.log(error);
            }
        });

    // reset this user's password
    } else if (e.target.closest('#user_reset_btn')) {
        e.preventDefault();
        var formData = new FormData();
        formData.append("dept", "pass_reset");
        formData.append("user", $("#user_id_input").val());
        $.ajax({
            type: 'POST',
            url: $("#edit_user_form").attr('action'),
            data: formData,
            dataType: 'json',
            contentType: false,
            processData: false,
            headers: {
                'X-CSRFToken': csrftoken
            },
            beforeSend: function() {
                $("#btn_reset").html("<i class='fas fa-spinner fa-pulse'></i> Reseting..");
                $("#btn_reset").attr("data-bs-target","");
            },
            success: function(response) {
                $("#btn_reset").html("Reset password");
                $("#btn_reset").attr("data-bs-target","#confirmResetModel");
                if(response.success) {
                    $("#user_info .fdback_sms").html("<span class='d-block w-100 m-0 mb-1 p-2 alert alert-success'><i class='fas fa-check-circle'></i> User password has been reset to his/her username (capital letters)</span>").slideDown('fast').delay(4000).slideUp('fast');
                } else {
                    $("#user_info .fdback_sms").html("<span class='d-block w-100 m-0 mb-1 p-2 alert alert-danger'><i class='fas fa-exclamation-circle'></i> Failed to reset password!</span>").slideDown('fast').delay(4000).slideUp('fast');
                }
            },
            error: function(xhr, status, error) {
                console.log(error);
            }
        });

    // delete this user's account
    } else if (e.target.closest('#user_del_btn')) {
        e.preventDefault();
        var formData = new FormData();
        formData.append("dept", "account_delete");
        formData.append("user", $("#user_id_input").val());
        $.ajax({
            type: 'POST',
            url: $("#edit_user_form").attr('action'),
            data: formData,
            dataType: 'json',
            contentType: false,
            processData: false,
            headers: {
                'X-CSRFToken': csrftoken
            },
            beforeSend: function() {
                $("#btn_delete").html("<i class='fas fa-spinner fa-pulse'></i> Deleting..");
                $("#btn_delete").attr("data-bs-target","");
            },
            success: function(response) {
                $("#btn_delete").html("Delete");
                $("#btn_delete").attr("data-bs-target","#confirmDelModel");
                if(response.success) {
                    window.history.back();
                } else {
                    $("#user_info .fdback_sms").html("<span class='d-block w-100 m-0 mb-1 p-2 alert alert-danger'><i class='fas fa-exclamation-circle'></i> Failed to delete this user account</span>").slideDown('fast').delay(4000).slideUp('fast');
                }
            },
            error: function(xhr, status, error) {
                console.log(error);
            }
        });
    }
});



