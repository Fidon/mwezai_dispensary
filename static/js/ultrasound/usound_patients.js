$("#container ul li a").click(function (e) { 
    e.preventDefault();
    var tab_id = $(this).attr('href').replace('#','');
    $("#container .tab_container .tab_div").each(function (index, element) {
        if ($(this).is(':visible')) {
            if($(this).attr('id') !== tab_id) {
                $(this).css('display','none');
                $('#'+tab_id).fadeIn('slow');
            }
        }
    });
});


// Get the CSRF token
var csrftoken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

$("#testsListTable tbody tr").click(function (e) { 
    e.preventDefault();
    $("#usound_num").val($(this).attr('id'));
    $("#usoundResultForm").modal({ backdrop: 'static', keyboard: false });
    $("#usoundResultForm").modal('show');

    $("#type").text($(".name", this).text());
    $("#ordered").text($(".order", this).text());
});

// Add row with input fields
$("#btn_row button").click(function (e) { 
    e.preventDefault();
    var newRow = "<tr><td><div class='form-floating'><input type='text' class='";
    newRow += "form-control text-ttxt1' placeholder='i'/><label class='text-ttxt1'>";
    newRow += "Item name</label></div></td><td><div class='form-floating'>";
    newRow += "<textarea class='form-control text-ttxt1' placeholder='v'></textarea>";
    newRow += "<label class='text-ttxt1'>Value..</label></div></td></tr>";
    $('#btn_row').before(newRow);
});

var FIELDS = [];
$("#usoundResultForm").submit(function (e) { 
    e.preventDefault();
    var test_report = $.trim($("#usoundReport").val());
    var report = (test_report.length > 0) ? test_report : "-";
    FIELDS.push($("#usound_num").val(), report);
    $("#usoundResultForm table tbody tr").each(function () {
        if($(this).attr('id') !== "btn_row") {
            var fd1 = $.trim($("input", this).val());
            var fd2 = $.trim($("textarea", this).val());
            if((fd1.length > 0) && (fd2.length > 0)) {
                var rowInput = {
                    itemName: fd1,
                    itemValue: fd2
                };
                FIELDS.push(rowInput);
            }
        }
    });

    if(FIELDS.length > 2) {
        var json_data = JSON.stringify(FIELDS);
        $.ajax({
            type: 'POST',
            url: "/ultrasound/usoundresult/submit/",
            data: json_data,
            dataType: 'json',
            contentType: 'application/json',
            headers: {
                'X-CSRFToken': csrftoken
            },
            beforeSend: function() {
                $("#usound_sub_btn").html("<i class='fas fa-spinner fa-pulse'></i>");
                $("#usound_sub_btn").attr('type','button');
                $("#cancel_btn").fadeOut('fast')
            },
            success: function(response) {
                $("#usound_sub_btn").html("Submit");
                $("#usound_sub_btn").attr('type','submit');
                $("#cancel_btn").fadeIn('fast')
                $('html, body').animate({ scrollTop: 0 }, 'slow');
                if(response.success) {
                    $("#usoundResultForm").modal('hide');
                    FIELDS.splice(0, FIELDS.length);
                    $("#usoundResultForm")[0].reset();
                    var tr_id = $("#usound_num").val();
                    $("#"+tr_id).slideUp('slow');
                    $("#testTableSms").html("<span class='alert alert-success d-block w-100 m-0 mb-2 p-2'><i class='fas fa-check-circle'></i> Test results submitted successfully!</span>").slideDown('fast').delay(4000).slideUp('fast');
                } else {
                    $("#usoundErrsms").html("<span class='alert alert-danger d-block w-100 m-0 mb-2 p-2'><i class='fas fa-exclamation-circle'></i> "+response.sms+"</span>").slideDown('fast').delay(4000).slideUp('fast');
                }
            },
            error: function(xhr, status, error) {
                console.log(error);
            }
        });
    } else {
        $("#usoundErrsms").html("<span class='alert alert-danger d-block w-100 m-0 mb-2 p-2'><i class='fas fa-exclamation-circle'></i> Fill atleast one item name and value.</span>").slideDown('fast').delay(4000).slideUp('fast');
        FIELDS.splice(0, FIELDS.length);
    }
});

function move_to_page(num) {
    window.location.href = "/ultrasound/patients/p/"+num+"/";
}

// retrieve past patient's history
function patient_history(parent, hist_date) {
    $(".details", parent).slideToggle('fast');

    if ($(".details", parent).text() == ""){
        var formData = new FormData();
        formData.append("result_date", hist_date);
        formData.append("patient", $("#id_patient").val());
        $.ajax({
            type: 'POST',
            url: "/ultrasound/patient/history/",
            data: formData,
            dataType: 'json',
            contentType: false,
            processData: false,
            headers: {
                'X-CSRFToken': csrftoken
            },
            beforeSend: function() {
                var loading = "<div class='text-center w-100 py-5 text-ttxt1'>";
                loading += "<div class='spinner-border' style='width:50px;height:50px;' role='status'>";
                loading += "<span class='visually-hidden'>Loading...</span></div></div>";
                $(".details", parent).html(loading);
            },
            success: function(response) {
                if(response.success) {
                    var html = ``;
                    var date_history = response.history;
                    for(let i = 0; i < date_history.length; i++) {
                        var hist = date_history[i];
                        var report_fields = hist.rows;
                        html += `<div class="w-100 bg-bblue text-white text-center py-1 rounded">Report ${i+1}/${date_history.length}</div>
                        <b>Test name:</b> &nbsp; <span>${hist.usound_name}</span><br>
                        <b>Order date:</b> &nbsp; <span>${hist.orderdate}</span><br>
                        <b>Ordered by:</b> &nbsp; <span>${hist.ordered_by}</span><br>
                        <b>Report date:</b> &nbsp; <span>${hist.reportdate}</span><br>
                        <b>Reported by:</b> &nbsp; <span>${hist.reporter}</span><br>
                        <b>Service cost:</b> &nbsp; <span>${hist.cost}</span>
                        <div class="mb-3"></div>
                        <b>Report:</b> &nbsp; <span>${hist.report.replace(/\n/g, '<br>')}</span><br><br>
                        <div class="mb-2"></div>
                        
                        <div class="border-bottom border-bblue text-bblue p-1">Report fields</div>`;
                        for (let y = 0; y < report_fields.length; y++) {
                            const row = report_fields[y];
                            html += `${y+1}. ${row.name}: &nbsp; <span>${row.value.replace(/\n/g, '<br>')}</span>`;
                            if(report_fields.length > y+1) html += `<br>`;
                        }
                        if(date_history.length > i+1) html += `<br><br>`;
                    }
                    $(".details", parent).html(html+"<br><br>");
                } else {
                    var fdback = "<div class='text-center w-100 py-5 text-ttxt1'><i class='fas fa-exclamation-circle'></i> Failed to load data!</div>";
                    $(".details", parent).html(fdback);
                }
            },
            error: function(xhr, status, error) {
                console.log(error);
            }
        });
    }
}


$("#container .patientlist .tab_container .tab_div .input-group button").click(function (e) {
    if($(this).attr('class').indexOf('reload_table') !== -1) {
        $("input", $(this).parent()).val("");
        var url_string = location.href;
        var search_id = $("input", $(this).parent()).attr('id');
        if (search_id.indexOf("patients") !== -1) {
            div_id = "#pat_allpatients";
        } else {
            div_id = "#pat_waiting";
        }
        
        $(div_id + " table").load(url_string + " " + div_id + " table");
        $(div_id + " .paging_info").load(url_string + " " + div_id + " .paging_info");
    } else {
        var input = $("input", $(this).parent());
        var search_id = input.attr('id');
        var search_str = $.trim(input.val());
        var url_string = location.href;
        if (url_string.indexOf("?") !== -1) {
            url_string = url_string+"&search="+search_str;
        } else {
            url_string = url_string+"?search="+search_str;
        }

        var div_id = "";
        if (search_id.indexOf("patients") !== -1) {
            div_id = "#pat_allpatients";
        } else {
            div_id = "#pat_waiting";
        }
        
        url_string = url_string + "&div=" + div_id.replace('#','');
        $(div_id + " table").load(url_string + " " + div_id + " table");
        $(div_id + " .paging_info").load(url_string + " " + div_id + " .paging_info");
    }
});

document.addEventListener('click', e => {
    const clickedElement = $(e.target);
    if (clickedElement.is('#container .patientlist .tab_container .pagination button')) {
        e.preventDefault();
        var currentScrollTop = $('html, body').scrollTop();
        var url_string = location.href + clickedElement.attr('href');
        var search_val = "";
        var url_obj = new URL(url_string);
        var div = url_obj.searchParams.get("div");
        var div_id = "";
        if (div == "patients") {
            div_id = "#pat_allpatients";
            search_val = $.trim($("#search_allpatients").val());
        } else {
            div_id = "#pat_waiting";
            search_val = $.trim($("#search_waiting").val());
        }
        
        if(search_val.length > 0) url_string = url_string + "&search=" + search_val + "&div=" + div_id;
        $(div_id + " table").load(url_string + " " + div_id + " table", function () {
            $('html, body').scrollTop(currentScrollTop);
        });
        $(div_id + " .paging_info").load(url_string + " " + div_id + " .paging_info", function () {
            $('html, body').scrollTop(currentScrollTop);
        });
    } else if (clickedElement.is('#pat_history .pagination button')) {
        e.preventDefault();
        var currentScrollTop = $('html, body').scrollTop();
        var url_string = location.href + clickedElement.attr('href');
        $("#pat_history .results_div").load(url_string + " #pat_history .results_div", function () {
            $('html, body').scrollTop(currentScrollTop);
        });
        $("#pat_history .paging_info").load(url_string + " #pat_history .paging_info", function () {
            $('html, body').scrollTop(currentScrollTop);
        });
    } else if (clickedElement.is("#pat_history .results_div .head")) {
        e.preventDefault();
        patient_history(clickedElement.parent(), clickedElement.attr('id'));
    }
});

$("#reload_button").click(function (e) {
    e.preventDefault();
    $("#patient_id_number").val("");
    var url_string = location.href;
    $("#patients_list_table").load(url_string + " #patients_list_table");
    $("#patients_pagination").load(url_string + " #patients_pagination");
});