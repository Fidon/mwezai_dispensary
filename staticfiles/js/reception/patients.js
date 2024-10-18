$(function () {
    if ($("#up_patientID").val().length > 0) {
        var gender = $("#up_gender").val();
        var religion = $("#up_religion").val();
        var marital = $("#up_marital").val();
        $("#chooseService option").each(function () {
            $(this).attr('selected',false);
            if($(this).attr('value') == 4) {
                $(this).attr('selected', true);
            }
        });
        $("#chooseService").change();
        $("#newpatientForm input[name='gender'][value='"+gender+"']").prop('checked', true);
        $("#pat_religion option").each(function () {
            $(this).attr('selected',false);
            if($(this).attr('value') == religion) {
                $(this).attr('selected',true);
            }
        });
        $("#pat_marital option").each(function () {
            $(this).attr('selected',false);
            if($(this).attr('value') == marital) {
                $(this).attr('selected',true);
            }
        });

        // $("#newpatientForm input[name='gender'], #chooseService, #pat_bdate").prop('disabled', true);
    }
});

// Change input fields based on service selected
$("#chooseService").change(function (e) {
    e.preventDefault();
    var service = $("option:selected", this).text().toLowerCase();
    
    if((service.indexOf("labolatory") !== -1) || ((service.indexOf("pharmacy") !== -1)) || ($(this).val() == "")) {
        $("#inputsWrapper").slideUp('fast');
        setTimeout(function() {
            $("#inputsWrapper").empty();
        }, 500);
    } else {
        $("#inputsWrapper").html($("#formInputsHolder").html());
        setTimeout(function() {
            $("#inputsWrapper").slideDown('fast');
        }, 500);
    }
});

// Check if entire string is alphabets
function onlyAlphabets(str) {
    const regex = /^[a-zA-Z][a-zA-Z'-]*[a-zA-Z']$/;
    return regex.test(str);
}

// capitalize the first letter
function cap(str) {
    var txt = str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    return txt;
}

// Get the CSRF token
var csrftoken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

// check the validity of the phone number
function validPhone(input) {
    const pattern = /^[0-9]{10}$/;
    if (!pattern.test(input.value)) {
      input.setCustomValidity('Please enter a 10-digit number.');
    } else {
      input.setCustomValidity('');
    }
}

// check the validity of number input
function validNum(input) {
    const pattern = /^\d+(\.\d{1})?$/;
    if (!pattern.test(input.value)) {
      input.setCustomValidity("Only numerical/decimal values are allowed!");
    } else {
      input.setCustomValidity('');
    }
}

// update patient's information
function update_patient_info(fullname) {
    var formData = new FormData();
    var service = $("#chooseService option:selected").text().toLowerCase();
    formData.append("patiend_id", parseInt($("#up_patientID").val()));
    formData.append("fullname", fullname);
    formData.append("birthdate", $("#pat_bdate").val());
    formData.append("gender", $("#gender_radio_div input[name='gender']:checked").val());
    formData.append("address", $.trim($("#pat_address").val()));
    formData.append("contact", $("#pat_contact").val());
    formData.append("comment", $.trim($("#pat_comment").val()));
    formData.append("religion", $("#pat_religion").val());
    formData.append("marital", $("#pat_marital").val());
    formData.append("occupation", $.trim($("#pat_occupation").val()));

    if((service !== "labolatory") && (service !== "pharmacy") && (service !== "")){
        formData.append("bloodPressure", $.trim($("#pat_bp").val()));
        formData.append("temperature", $.trim($("#pat_temp").val()));
        formData.append("heartRate", $.trim($("#pat_hrate").val()));
        formData.append("weight", $.trim($("#pat_weight").val()));
        formData.append("saturation", $.trim($("#pat_sat").val()));
    }

    $.ajax({
        type: 'POST',
        url: "/reception/patient/save-info/",
        data: formData,
        dataType: 'json',
        contentType: false,
        processData: false,
        headers: {
            'X-CSRFToken': csrftoken
        },
        beforeSend: function() {
            $("#pat_register_btn").html("<i class='fas fa-spinner fa-pulse'></i>");
            $("#pat_register_btn").attr('type','button');
        },
        success: function(response) {
            $("#pat_register_btn").text("Update");
            $("#pat_register_btn").attr('type','submit');
            $('html, body').animate({ scrollTop: 0 }, 'slow');
            if(response.success) {
                window.location.href = "/reception/pay/p/"+response.num+"/";
            } else {
                $("#pat_formsms").html("<span class='py-2 alert alert-danger'><i class='fas fa-exclamation-circle'></i> "+response.sms+"</span>").slideDown('fast').delay(5000).slideUp('fast');
            }
        },
        error: function(xhr, status, error) {
            console.log(error);
        }
    });
}

// register new patient
$("#newpatientForm").submit(function (e) { 
    e.preventDefault();
    var service = $("#chooseService").val();
    var fname = $.trim($("#pat_fname").val());
    var names = fname.split(" ");

    if((names.length == 2) || (names.length == 3)) {
        var nameful = "";
        var isvalid = true; var errTxt = "";
        for (var i = 0; i < names.length; i++) {
            var name = names[i];
            if ((name.length < 3) || (name.length > 32)) {
                isvalid = false;
                errTxt = "length";
                break;
            } else if(!(onlyAlphabets(name))) {
                isvalid = false;
                errTxt = "alphabets";
                break;
            }
            if(nameful.length == 0) {
                nameful = cap(name);
            } else {
                nameful = nameful + " " + cap(name);
            }
        }
        if(isvalid) {
            if ($("#up_patientID").length == 0) {
                var formData = new FormData();
                formData.append("fullname", nameful);
                formData.append("birthDate", $("#pat_bdate").val());
                formData.append("gender", $("input[name='gender']:checked", this).val());
                formData.append("address", $.trim($("#pat_address").val()));
                formData.append("contact", $("#pat_contact").val());
                formData.append("comment", $.trim($("#pat_comment").val()));
                if(service > 3) {
                    var p_religion = $("#pat_religion").val();
                    var p_marital = $("#pat_marital").val();
                    var p_occupation = $.trim($("#pat_occupation").val());
                    var p_bp = $.trim($("#pat_bp").val());
                    var p_temp = $.trim($("#pat_temp").val());
                    var p_hrate = $.trim($("#pat_hrate").val());
                    var p_weight = $.trim($("#pat_weight").val());
                    var p_sat = $.trim($("#pat_sat").val());

                    formData.append("religion", p_religion);
                    formData.append("marital", p_marital);
                    formData.append("occupation", p_occupation);
                    formData.append("bloodPressure", p_bp);
                    formData.append("temperature", p_temp);
                    formData.append("heartRate", p_hrate);
                    formData.append("weight", p_weight);
                    formData.append("saturation", p_sat);
                    formData.append("vitals", true);
                }
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
                        $("#pat_register_btn").html("<i class='fas fa-spinner fa-pulse'></i>");
                        $("#pat_register_btn").attr('type','button');
                    },
                    success: function(response) {
                        $("#pat_register_btn").text("Register");
                        $("#pat_register_btn").attr('type','submit');
                        $('html, body').animate({ scrollTop: 0 }, 'slow');
                        if(response.success) {
                            window.location.href = "/reception/pay/p/"+response.num+"/";
                        } else {
                            $("#pat_formsms").html("<span class='py-2 alert alert-danger'><i class='fas fa-exclamation-circle'></i> "+response.sms+"</span>").slideDown('fast').delay(5000).slideUp('fast');
                        }
                    },
                    error: function(xhr, status, error) {
                        console.log(error);
                    }
                });
            } else {
                update_patient_info(nameful);
            }
        } else {
            $("#pat_fname").focus();
            if(errTxt == "length") {
                $("#err_fname").html("<i class='fas exclamation-circle'></i> Each name should be 3 - 32 characters long!").fadeIn('fast').delay(5000).fadeOut('fast');
            } else {
                $("#err_fname").html("<i class='fas exclamation-circle'></i> The use of special characters or numbers is not allowed!").fadeIn('fast').delay(5000).fadeOut('fast');
            }
        }
    } else {
        $("#pat_fname").focus();
        $("#err_fname").html("<i class='fas fa-exclamation-circle'></i> Only 2 or 3 names separated by single space are allowed!").fadeIn('fast').delay(5000).fadeOut('fast');
    }
});





