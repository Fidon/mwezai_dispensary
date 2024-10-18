$("#container ul li a").click(function (e) { 
    e.preventDefault();
    var tab_id = $(this).attr('href').replace('#','');
    $("#container .tab_container .tab_div").each(function () {
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

var medicines_array = [];
$("#pharma_btn").click(function (e) { 
    e.preventDefault();
    var rows_total = $("#medicinesTable tbody tr").not('.ready').length;
    var checked_rows = 0;
    $("#medicinesTable tbody tr").not('.ready').each(function () {
        if($("td input", this).is(':checked')) {
            var check_id = $("td input", this).attr('id');
            medicines_array.push(check_id);
            checked_rows++;
        }
    });

    if(checked_rows > 0) {
        var json_data = JSON.stringify(medicines_array);
        $.ajax({
            type: 'POST',
            url: "/pharmacy/medicals/submit/",
            data: json_data,
            dataType: 'json',
            contentType: 'application/json',
            headers: {
                'X-CSRFToken': csrftoken
            },
            beforeSend: function() {
                $("#medicineFormsms").slideUp('fast');
                $("#pharma_btn").removeClass("d-inline-block").addClass("d-none");
                $("#pharma_load").removeClass("d-none").addClass("d-inline-block");
            },
            success: function(response) {
                $("#pharma_btn").removeClass("d-none").addClass("d-inline-block");
                $("#pharma_load").removeClass("d-inline-block").addClass("d-none");
                $('html, body').animate({ scrollTop: 0 }, 'slow');
                if(response.success) {
                    var failed_array = [];
                    for (let y = 0; y < response.failed.length; y++) failed_array.push(response.failed[y].id);
                    medicines_array.splice(0, medicines_array.length);

                    $("#medicinesTable tbody tr").not('.ready').each(function () {
                        var checked = $("td input", this).is(':checked');
                        var id = !failed_array.includes($("td input", this).attr('id'));
                        if(checked && id) {
                            $(this).slideUp('slow');
                            $(this).attr('class','ready')
                        }
                    });
                    if((rows_total == checked_rows) && (response.failed.length == 0)) {
                        $("#serve_buttons").fadeOut('fast');
                        $("#successResult").modal('show');
                        // $("#pat_prescription").load(location.href + " #pat_prescription");
                    } else {
                        if (response.failed.length > 0) {
                            var alert = `<span class="alert alert-warning d-block w-100 p-2 m-0 mb-2"><i class="fas fa-info-circle"></i>`;
                            var html = ` Some medicines encountered problems:<br>`;
                            for (let y = 0; y < response.failed.length; y++) {
                                var md = response.failed[y];
                                html += `${y+1}. ${md.name} &nbsp; ${md.problem}`;
                                if (response.failed.length > y+1) html += `<br>`;
                            }
                            $("#medicineFormsms").html(alert+html).slideDown('fast');
                        } else {
                            var alert = `<span class="alert alert-success d-block w-100 p-2 m-0 mb-2"><i class="fas fa-check-circle"></i> `;
                            var html = `Medicines served successfully!`;
                            $("#medicineFormsms").html(alert+html).slideDown('fast').delay(5000).slideUp('fast');
                        }
                    }
                } else {
                    $("#medicineFormsms").html("<span class='alert alert-danger d-block w-100 p-2 m-0 mb-2'><i class='fas fa-exclamation-circle'></i> "+response.sms+"</span>").slideDown('fast').delay(4000).slideUp('fast');
                }
            },
            error: function(xhr, status, error) {
                console.log(error);
            }
        });
    }
});



function move_to_page(num, path) {
    if(path == "patient") {
        window.location.href = "/pharmacy/patients/p/"+num+"/";
    } else {
        window.location.href = "/pharmacy/inventory/m/"+num+"/";
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


// retrieve past patient's history
function patient_history(parent, hist_date) {
    $(".details", parent).slideToggle('fast');

    if ($(".details", parent).text() == ""){
        var formData = new FormData();
        formData.append("result_date", hist_date);
        formData.append("patient", $("#id_patient").val());
        $.ajax({
            type: 'POST',
            url: "/pharmacy/patient-history/",
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
                    var html = `<table class="table">
                    <thead class="bg-ddark text-white">
                        <tr>
                            <th>S/n</th>
                            <th>Dates</th>
                            <th>Prescriber</th>
                            <th>Medicine</th>
                            <th>Formulation</th>
                            <th>Price</th>
                            <th>Qty</th>
                            <th>Cost</th>
                            <th>Dosage</th>
                            <th>Server</th>
                        </tr>
                    </thead>
                    <tbody class="text-ttxt1">`;

                    var date_history = response.med_list;
                    for(let i = 0; i < date_history.length; i++) {
                        var hist = date_history[i];
                        html += `<tr><td class="align-middle">${i+1}</td>
                        <td class="align-middle text-nowrap">${hist.dates}</td>
                        <td class="align-middle text-start">${hist.prescribed_by}</td>
                        <td class="align-middle text-start text-nowrap" style="cursor:pointer;" onclick="move_to_page('${hist.medicine}', 'med')">${hist.med_name}</td>
                        <td class="align-middle text-start">${hist.med_formulation}</td>
                        <td class="align-middle text-end">${hist.med_price}</td>
                        <td class="align-middle">${hist.med_qty}</td>
                        <td class="align-middle text-end">${hist.med_cost}</td>
                        <td class="align-middle text-start text-nowrap">${hist.med_dosage.replace(/\n/g, '<br>')}</td>
                        <td class="align-middle text-start">${hist.med_server}</td></tr>`;
                    }
                    html += `<tr><th colspan="10" class="align-middle text-start">Total cost: &nbsp; ${response.grand_cost} TZS</th></tr></tbody>`;
                    $(".details", parent).html(html);
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