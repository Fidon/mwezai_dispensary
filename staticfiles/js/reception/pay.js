// Get the CSRF token
var csrftoken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

// **********************************************************************
// search patient file number
$("#reload_button").click(function (e) {
    e.preventDefault();
    $("#patient_id_number").val("");
    var url_string = location.href;
    $("#patients_list_table").load(url_string + " #patients_list_table");
    $("#patients_pagination").load(url_string + " #patients_pagination");
});


$("#searchPatientForm").submit(function (e) {
    e.preventDefault();
    var search_str = $.trim($("#patient_id_number").val());
    if (search_str.length == 0) {
        $("#patient_id_number").val("");
        var url_string = location.href;
        $("#patients_list_table").load(url_string + " #patients_list_table");
        $("#patients_pagination").load(url_string + " #patients_pagination");
    } else {
        var url_string = location.href;
        if (url_string.indexOf("?") !== -1) {
            url_string = url_string+"&search="+search_str;
        } else {
            url_string = url_string+"?search="+search_str;
        }

        $("#patients_list_table").load(url_string + " #patients_list_table");
        $("#patients_pagination").load(url_string + " #patients_pagination");
    }
});


document.addEventListener('click', e => {
    const clickedElement = $(e.target);
    const currentScrollTop = $('html, body').scrollTop();
    if (clickedElement.is('#patients_pagination .pagination button')) {
        e.preventDefault();
        var url_string = location.href + clickedElement.attr('href');
        var search_val = $.trim($("#patient_id_number").val());
        
        if(search_val.length > 0) url_string = url_string + "&search=" + search_val;
        $("#patients_list_table").load(url_string + " #patients_list_table", function () {
            $('html, body').scrollTop(currentScrollTop);
        });
        $("#patients_pagination").load(url_string + " #patients_pagination", function () {
            $('html, body').scrollTop(currentScrollTop);
        });
    }
    // else if (clickedElement.is('#vitals_pagination .pagination button')) {
    //     e.preventDefault();
    //     // alert("ID: "+(location.href+clickedElement.attr('href')));
    //     var url_string = location.href + clickedElement.attr('href');
    //     $("#vitals_div").load(url_string + " #vitals_div", function () {
    //         $('html, body').scrollTop(currentScrollTop);
    //     });
    //     $("#vitals_pagination").load(url_string + " #vitals_pagination", function () {
    //         $('html, body').scrollTop(currentScrollTop);
    //     });
    // }
});

// **********************************************************************


// slideup elements passed in here
function closeup(id) {
    $("#container form .dropdownSelect").each(function () {
        if($(this).attr('id') !== id) {
            if ($(this).is(':visible')) {
                $(this).slideUp('fast');
                $(".drop", this).slideUp('fast');
            }
        }
    });
}

// Change form input fields based on service selected
$("#selectService").change(function (e) {
    e.preventDefault();
    var selectedOption = $("option:selected", this).text().toLowerCase();
    if (selectedOption.includes("labolatory") || selectedOption.includes("pharmacy")) {
        var targetWrapper = selectedOption.includes("labolatory") ? "labWrapper" : "medsWrapper";
        $("#" + targetWrapper).slideDown('fast');
        closeup(targetWrapper);
    } else {
        var selectedValue = $(this).val();
        if (selectedValue !== "") {
            var serviceKeywords = ["doctor", "procedure", "ultra"];
            for (var i = 0; i < serviceKeywords.length; i++) {
                if (selectedOption.includes(serviceKeywords[i])) {
                    var wrapperID = (serviceKeywords[i] === "doctor") ? "docWrapper" : serviceKeywords[i] + "Wrapper";
                    $("#" + wrapperID).slideDown('fast');
                    closeup(wrapperID);
                    break;
                }
            }
        } else { closeup('all'); }
    }
});

// dropdown box for items selection
function slidedown(id) {
    $("#"+id+" .drop").slideToggle('fast');
}

// format number with commas
function num_str(number) {
    return number.toLocaleString('en-US');
}

// convert string-number with commas into actual number
function str_num(number) {
    if (typeof number === 'number' || !isNaN(number)) {
        return parseFloat(number);
    }
    return parseFloat(number.replace(/,/g, ''));
}

// check if specific key exists in 2D array then delete it
function deletePairByKey(arr, keyToDelete) {
    for (let i=0; i<arr.length; i++) {
        const pair = arr[i];
        if (pair[0] === keyToDelete) {
            arr.splice(i, 1);
            return true;
        }
    }
    return false;
}

// Array definitions
const SERVICES = [];
const DOCTORS = [];
const DESCRIPTIONS = [];
const PENDING_IDS = [];
const WAITING_IDS = [];
var CREDIT_BALANCE = 0;

// add entries into arrays defined above
function add_items(value, categ) {
    if ((categ == "doc" && !DOCTORS.includes(value)) || (categ != "doc" && !SERVICES.includes(value))) {
        if (categ == "med") {
            var desc = $.trim($("#md_dosage").val()).length === 0 ? " - " : $.trim($("#md_dosage").val());
            var medic_qty = $("#md_qty").val();
            var medic_form = $("#md_formula").val();
            DESCRIPTIONS.push([value, medic_qty, medic_form, desc]);
        } else {
            DESCRIPTIONS.push([value, 0, 0, 0]);
        }
        if (categ == "doc") {
            DOCTORS.push(value);
        } else {
            SERVICES.push(value);
        }
        return true;
    } else {
        return false;
    }
}

// add item to payments list
function add_payment(id, serv, el, item_id) {
    var testTxt = "";
    if (serv == "doctor") {
        testTxt = "doc";
    } else if (serv == "pharmacy") {
        testTxt = "med";
    } else {
        testTxt = "others";
    }

    var addItem = add_items(item_id, testTxt);

    if (addItem) {
        var qty, getprice, names, cost;

        if (serv.toLowerCase() === "pharmacy") {
            qty = $("#md_qty").val() > 0 ? $("#md_qty").val() : 1;
            getprice = $("#mdTotal").text();
            names = $("#md_name").val() + " (" + $("#md_formula").val() + ")";
            cost = str_num(getprice);
        } else {
            if (serv.toLowerCase() === "doctor") {
                getprice = $('b', el).text();
            } else {
                getprice = $(".price", el).text();
            }
            names = $(".name", el).text();
            cost = str_num(getprice);
        }

        var service_div = $("#container form .pay_list .serv_" + id);
        var totalamount_div = $("#container form .pay_list .totalcost span");
        var credit = $("#credit_total");
        var new_price = '0';
        var new_credit = '0';

        if (str_num(credit.text()) >= str_num(totalamount_div.text())) {
            var temp = eval(str_num(credit.text()) - cost);
            if (temp <= 0) {
                new_credit = 0;
                new_price = eval(cost - str_num(credit.text()) + str_num(totalamount_div.text()));
                CREDIT_BALANCE += str_num(credit.text());
            } else {
                new_credit = eval(str_num(credit.text()) - cost);
                new_price = 0;
                CREDIT_BALANCE += cost;
            }
        } else {
            new_price = eval(str_num(totalamount_div.text()) + cost);
        }

        var itemInfo = serv.toLowerCase() === "pharmacy" ? `x ${qty} - ${getprice}` : `- ${getprice}`;

        if (service_div.length > 0) {
            var newItem = `<span id='${item_id}-${serv}'>--> ${names} ${itemInfo} &nbsp; <i class='fas fa-times-circle' title='Cancel' onclick='del(this)'></i></span>`;
            service_div.append(newItem);
        } else {
            var txt = serv.charAt(0).toUpperCase() + serv.slice(1).toLowerCase();
            var payDiv = $("#container form .pay_list");
            var newItem = `<div class='serv_${id}'><b>${txt}:</b><br>`;
            newItem += `<span id='${item_id}-${serv}'>--> ${names} ${itemInfo} &nbsp; <i class='fas fa-times-circle' title='Cancel' onclick='del(this)'></i></span></div>`;
            payDiv.prepend(newItem);
        }
        
        totalamount_div.text(num_str(new_price));
        credit.text(str_num(new_credit));

        if ($("#formsubmit_btn_div").hasClass('d-none')) {
            $("#formsubmit_btn_div").removeClass("d-none").addClass("d-block");
        }
    } else {
        console.log("already added");
    }
}


// remove/delete item from payments list
function del(el) {
    var ids = $(el).parent().attr('id').split("-");
    if(ids[1] == "doctor") {
        var id_idx = DOCTORS.indexOf(parseInt(ids[0]));
        if (id_idx !== -1) {
            DOCTORS.splice(id_idx, 1);
        }
    } else {
        var id_idx = SERVICES.indexOf(parseInt(ids[0]));
        if (id_idx !== -1) {
            SERVICES.splice(id_idx, 1);
            if(ids[1] == "pharmacy") {
                deletePairByKey(DESCRIPTIONS, parseInt(ids[0]));
            }
        }
    }
    
    var getPrice = $(el).parent().text().split(" &nbsp; ");
    var fetchPrice = getPrice[getPrice.length - 1].split(" - ");
    var price = fetchPrice[fetchPrice.length - 1];
    var totalamount_div = $("#container form .pay_list .totalcost span");
    var newTotal = 0;
    var credit = $("#credit_total");

    if(str_num(totalamount_div.text()) >= str_num(price)) {
        newTotal = eval(str_num(totalamount_div.text()) - str_num(price));
    } else {
        newTotal = '0';
        var temp_price = str_num(price) - str_num(totalamount_div.text())
        CREDIT_BALANCE -= temp_price
        credit.text(eval(str_num(credit.text()) + temp_price));
    }
    
    $(el).parent().fadeOut('fast');
    if (($(el).parent().prev().is('br')) && ($(el).parent().next().length == 0)) {
        $(el).parent().prev().parent().fadeOut('fast');
        setTimeout(function() {
            $(el).parent().prev().parent().remove();
        }, 500);
    }
    
    totalamount_div.text(num_str(newTotal));
    setTimeout(function() {
        $(el).parent().remove();
    }, 500);
    
    if((PENDING_IDS.length == 0) && (SERVICES.length == 0) && (DOCTORS.length == 0)) {
        $("#formsubmit_btn_div").removeClass("d-block").addClass("d-none");
    }
}

// validate file number input
function filenumber(input) {
    const pattern = /^[a-zA-Z]{1,2}\d{4}$/;
    if (!pattern.test(input.value)) {
      input.setCustomValidity("Enter valid patient file number, e.g Y1234 or YK1234");
    } else {
      input.setCustomValidity('');
    }
}

// retrieve medicine information
function view_med(elm) {
    $("#md_qty").val('');
    $("#md_dosage").val('');
    $("#message_divbox").css("display","none");
    const id = $(elm).attr('id').replace('md_','');
    var formData = new FormData();
    formData.append("medicine", id);
    $.ajax({
        type: 'POST',
        url: "/reception/pay/load-medicine-info/",
        data: formData,
        dataType: 'json',
        contentType: false,
        processData: false,
        headers: {
            'X-CSRFToken': csrftoken
        },
        beforeSend: function() {
            $("#med_okay_btn").html("<i class='fas fa-spinner fa-pulse'></i>");
        },
        success: function(response) {
            $("#med_okay_btn").text("OK");
            if(response.success) {
                $("#med_okay_btn").attr("onclick", "add_payment(55, 'pharmacy', this, "+response.med.id+")");
                $("#md_name").val(response.med.names);
                $("#md_formula option").each(function () {
                    $(this).attr('selected',false);
                    if($(this).attr('value') == response.med.form) {
                        $(this).attr('selected',true);
                    }
                });
                $("#md_formula").change();
                $("#mdStock").text(response.med.qty);
                $("#mdPrice").text(num_str(response.med.price));
                $("#mdQuant").text(1);
                $("#mdTotal").text(num_str(response.med.price));
            } else {
                $("#med_cancel_btn").click();
            }
        },
        error: function(xhr, status, error) {
            console.log(error);
        }
    });
};

// update total medicine cost as quantity changes
var click_attr = "";
$("#md_qty").keyup(function () {
    if(click_attr == "") click_attr = $("#med_okay_btn").attr("onclick");
    var qty = $(this).val();
    var stock = $("#mdStock").text();
    var pattern = /^\d+$/;
    if (qty > str_num(stock)) {
        $("#message_divbox span").html("<i class='fas fa-exclamation-circle'></i> Quantity cannot exceed available stock.");
        $("#message_divbox").slideDown('fast');
        $("#med_okay_btn").attr("onclick","");
        $("#med_okay_btn").attr("data-bs-dismiss","");
    } else if ((qty <= 0) || (qty == "")) {
        $("#message_divbox span").html("<i class='fas fa-exclamation-circle'></i> Quantity cannot be 0 or blank!");
        $("#message_divbox").slideDown('fast');
        $("#med_okay_btn").attr("onclick", "");
        $("#med_okay_btn").attr("data-bs-dismiss","");
    } else if(!pattern.test(qty)) {
        $("#message_divbox span").html("<i class='fas fa-exclamation-circle'></i> Only numerical values without decimals are allowed!");
        $("#message_divbox").slideDown('fast');
        $("#med_okay_btn").attr("onclick", "");
        $("#med_okay_btn").attr("data-bs-dismiss","");
    } else {
        $("#mdQuant").text(qty);
        var price = $("#mdPrice").text();
        var totalCost = qty * str_num(price);
        $("#mdTotal").text(num_str(totalCost));
        $("#message_divbox").slideUp('fast');
        $("#med_okay_btn").attr("onclick", click_attr);
        $("#med_okay_btn").attr("data-bs-dismiss","modal");
        click_attr = "";
    }
});

// confirm payment submission
$("#submitPayList").click(function (e) {
    var money = $("#container form .pay_list .totalcost span").text();
    $("#confirmPayModal .modal-body b").text(money);
});

// submit patients' services & their payments
$("#submitFormBtn").click(function (e) { 
    e.preventDefault();
    if((SERVICES.length > 0) || (DOCTORS.length > 0) || (PENDING_IDS.length > 0)) {
        var patientNum = $("#patientFnumber").val();
        var requestData = [{'pending': PENDING_IDS}];

        // Process services
        for (let x = 0; x < SERVICES.length; x++) {
            const service = SERVICES[x];
            const matchingDescription = DESCRIPTIONS.find(pair => pair[0] === service);
            const rowData = {
                patient: patientNum,
                service: service,
                doctor_service: '0',
                doctor: '0',
                md_qty: matchingDescription ? matchingDescription[1] : '0',
                md_form: matchingDescription ? matchingDescription[2] : '0',
                md_dosage: matchingDescription ? matchingDescription[3] : '0'
            };
            requestData.push(rowData);
        }

        // Process doctors
        for (let x = 0; x < DOCTORS.length; x++) {
            const doctor = DOCTORS[x];
            const rowData = {
                patient: patientNum,
                service: '0',
                doctor_service: '1',
                doctor: doctor,
                md_qty: '0',
                md_form: '0',
                md_dosage: '0'
            };
            requestData.push(rowData);
        }

        var jsonData = JSON.stringify(requestData);
        var $submitPayList = $("#submitPayList");
        $.ajax({
            type: 'POST',
            url: "/reception/pay/submit-patient-payments/",
            data: jsonData,
            dataType: 'json',
            contentType: 'application/json',
            headers: {
                'X-CSRFToken': csrftoken
            },
            beforeSend: function() {
                $submitPayList.html("<i class='fas fa-spinner fa-pulse'></i>");
                $submitPayList.attr('data-bs-toggle', '');
                $submitPayList.attr('data-bs-target', '');
            },
            success: function(response) {
                $submitPayList.html("Submit");
                $submitPayList.attr('data-bs-toggle', 'modal');
                $submitPayList.attr('data-bs-target', '#confirmPayModal');
                $('html, body').animate({ scrollTop: 0 }, 'slow');
                
                if (response.success) {
                    $("#payFormSms").html("<span class='py-2 mb-1 alert alert-success'><i class='fas fa-check-circle'></i> " + response.sms + "</span")
                        .slideDown('fast')
                        .delay(4000)
                        .slideUp('fast');

                    SERVICES.splice(0, SERVICES.length);
                    DOCTORS.splice(0, DOCTORS.length);
                    DESCRIPTIONS.splice(0, DESCRIPTIONS.length);
                    $("#container form .pay_list > :not(div.totalcost)").fadeOut('slow', function() {
                        $("#container form .pay_list > :not(div.totalcost)").remove();
                    });

                    if (response.status) {
                        var pending_array = response.failed_list;
                        $("#pending_total_cost span").each(function () {
                            var id = $(this).attr('id');
                            var ipo_kwenye_array = !pending_array.includes(parseInt(id));
                            if (ipo_kwenye_array && (id !== 'id_pending') && (id !== 'totCostPending')) {
                                var spn = $(this);
                                spn.fadeOut('fast', function() {
                                    PENDING_IDS.splice(PENDING_IDS.indexOf(id), 1);
                                    spn.remove();
                                    spn.next().remove();
                                });
                            }
                        });
                        var amount = parseFloat(response.amount);
                        $("#container form .pay_list div.totalcost b span").text(num_str(amount));
                        $("#pending_total_cost b span").text(num_str(amount));
                    } else {
                        $("#pending_total_cost").html("<span>No pending payments!</span>");
                        $("#container form .pay_list div.totalcost b span").text(0.0);
                    }
                    closeup('all');
                } else {
                    $("#payFormSms").html("<span class='py-2 mb-1 alert alert-danger'><i class='fas fa-exclamation-circle'></i> " + response.sms + "</span")
                        .slideDown('fast')
                        .delay(4000)
                        .slideUp('fast');
                }
            },
            error: function(xhr, status, error) {
                console.log(error);
            }
        });
    }
});

// operations done immediately after page loads
$(function () {
    var ids = $("#id_pending").text().split('_');
    if($("#id_pending").text().length > 0) {
        for(let x=0; x<ids.length; x++) PENDING_IDS.push(parseInt(ids[x]));
    }

    var waiting = $("#id_waiting").text().split('_');
    if($("#id_waiting").text().length > 0) {
        for(let y=0; y<waiting.length; y++) WAITING_IDS.push(parseInt(waiting[y]));
    }
});

// cancel pending & waiting services in the dbase
function delete_pending(id, action) {
    const pattern = /^[a-zA-Z]{1,2}\d{4}$/;
    var formData = new FormData();
    formData.append("test_update_id", id);
    formData.append("action", action);
    var current_url = window.location.href.split("/p/");
    var patient_file = current_url[current_url.length-1].replace("/","");
    if (pattern.test(patient_file)) {
        formData.append("patient", patient_file);

        $.ajax({
            type: 'POST',
            url: "/reception/pay/remove-pending/",
            data: formData,
            dataType: 'json',
            contentType: false,
            processData: false,
            headers: {
                'X-CSRFToken': csrftoken
            },
            beforeSend: function() {},
            success: function(response) {},
            error: function(xhr, status, error) {}
        });
    }
}

// remove service id from pending service array
function delete_id(id, act, el) {
    var ids, type, message;
    if (act == "pend") {
        ids = PENDING_IDS;
        type = "pending";
        message = "No pending payments!";
    } else {
        ids = WAITING_IDS;
        type = "waiting";
        message = "No any service(s) waiting!";
    }

    var index = ids.indexOf(parseInt(id));
    if (index !== -1) {
        delete_pending(parseInt(id), type);
        ids.splice(index, 1);
        $(el).parent().slideUp('slow');
        $(el).parent().next().slideUp('fast');

        if (ids.length == 0) {
            var html = "<span>" + message + "</span>";
            $(el).parent().parent().html(html);
        }

        var getPrice = $(el).parent().text().split(" &nbsp; ");
        var fetchPrice = getPrice[getPrice.length - 1].split(" - ");
        var price = fetchPrice[fetchPrice.length - 1];

        var total_pen = $("#totCostPending");
        var credit = $("#credit_total");
        var totalamount = $("#container form .pay_list .totalcost span");

        var new_pen_total = eval(str_num(total_pen.text()) - str_num(price));
        total_pen.text(num_str(new_pen_total));

        if (str_num(totalamount.text()) >= str_num(total_pen.text())) {
            var new_total = eval(str_num(totalamount.text()) - str_num(price));
            totalamount.text(num_str(new_total));
        }
        
        if (type == "waiting") {
            var new_credit = eval(str_num(credit.text()) + str_num(price));
            credit.text(num_str(new_credit));
        }

        if ((PENDING_IDS.length == 0) && (SERVICES.length == 0) && (DOCTORS.length == 0)) {
            $("#formsubmit_btn_div").removeClass("d-block").addClass("d-none");
        }

        setTimeout(function () {
            $(el).parent().remove();
            $(el).parent().next().remove();
        }, 1000);
    }
}

// search services
function search(qry, context) {
    const formData = new FormData();
    formData.append("query", $.trim($(qry).val()));
    formData.append("context", context);

    const endpoint = "/services/search/";

    $.ajax({
        type: 'POST',
        url: endpoint,
        data: formData,
        dataType: 'json',
        contentType: false,
        processData: false,
        headers: {
            'X-CSRFToken': csrftoken
        },
        beforeSend: function() {
            $(".searching", $(qry).parent()).fadeIn('fast');
        },
        success: function(response) {
            const contents = $(".contents", $(qry).parent());

            if (response.results.length > 0) {
                const html = generateHtml(response.results, context);
                contents.html(html);
                $('[data-bs-toggle="tooltip"]').tooltip();
            } else {
                contents.html(`<div class='py-3 text-center'>No results found!</div>`);
            }
        },
        error: function(xhr, status, error) {
            console.error(error);
        }
    });
}

// generate html contents for search results
function generateHtml(results, context) {
    let html = "";
    const pulse = `<span class='searching'>Searching..<i class='fas fa-spinner fa-pulse'></i></span>`;
    
    for (let y = 0; y < results.length; y++) {
        const item = results[y];
        
        if (context === "med") {
            html += `<div onclick="view_med(this)" data-bs-toggle='modal' data-bs-target='#medicineModal' id='md_${item.id}'>`;
            html += `<span>${item.name} (${item.form})</span>`;
            html += `<span class='price'>${num_str(item.price)}</span></div>`;
        } else if (context === "doc") {
            html += `<div onclick="add_payment(22, 'doctor', this, ${item.id})" `;
            html += `data-bs-toggle='tooltip' title='${num_str(item.price)}'>`;
            html += `<b class='d-none'>${num_str(item.price)}</b>`;
            html += `<span class='name w73'>${item.name}</span>`;
            html += `<span class='price w27'>${item.count}</span></div>`;
        } else {
            let id = 44;
            if (context === 'lab') {
                id = 11;
            } else if (context === 'ult') {
                id = 33;
            }
            
            html += `<div onclick='add_payment(${id}, "labolatory", this, ${item.id})'>`;
            html += `<span class='name'>${item.name}</span>`;
            html += `<span class='price'>${num_str(item.price)}</span></div>`;
        }
    }
    
    return html + pulse;
}


// open date range modal
$("#bill_print_btn").click(function (e) { 
    e.preventDefault();
    $("#dateFilterModal").modal('show');
});


$("#date_filter_clear").click(function (e) {
    $("#min_date").val("");
    $("#max_date").val("");
});


function get_dates(dt) {
    const mindate = $('#min_date').val();
    const maxdate = $('#max_date').val();
    let dt_start = "";
    let dt_end = "";
    if (mindate) dt_start = mindate + ' 00:00:00.000000';
    if (maxdate) dt_end = maxdate + ' 23:59:59.999999';
    return (dt === 0) ? dt_start : dt_end;
}


$("#date_filter_btn").click(function (e) {
    e.preventDefault();

    // Initialize variables
    const formData = new FormData();
    var context = "bill_dates_" + $("#patientFnumber").val();
    const endpoint = "/services/search/";

    // Append data to the formData
    formData.append("start_date", get_dates(0));
    formData.append("end_date", get_dates(1));
    formData.append("context", context);

    // AJAX request
    $.ajax({
        type: 'POST',
        url: endpoint,
        data: formData,
        dataType: 'json',
        contentType: false,
        processData: false,
        headers: {
            'X-CSRFToken': csrftoken
        },
        beforeSend: function () {
            // Show loading spinner and hide other elements
            $("#date_filter_dismiss, #date_filter_clear").hide('fast');
            $("#date_filter_btn").html("<i class='fas fa-spinner fa-pulse'></i>");
        },
        success: function (response) {
            // Handle the response
            if ((response.paid_list.length > 0) || (response.unpaid_list.length > 0)) {
                // Handle paid bills
                if (response.paid_list.length > 0) {
                    var bills_paid = "";
                    var total_paid = 0.0;
                    for (let x = 0; x < response.paid_list.length; x++) {
                        var bill = response.paid_list[x];
                        bills_paid += `<span>${x + 1}. ${bill.dept}: ${bill.names}<i>${num_str(bill.price)}</i></span>`;
                        total_paid += bill.price;
                    }
                    bills_paid += `<span class="fw-bold">Total paid: <i>TZS. ${num_str(total_paid)}</i></span>`;
                    $("#print_paid_bills").html(bills_paid);
                } else {
                    var html = `<div class="text-center">No paid bills!</div>`;
                    $("#print_paid_bills").html(html);
                }

                // Handle unpaid bills
                if (response.unpaid_list.length > 0) {
                    var bills_unpaid = "";
                    var total = 0.0;
                    for (let x = 0; x < response.unpaid_list.length; x++) {
                        var bill = response.unpaid_list[x];
                        bills_unpaid += `<span>${x + 1}. ${bill.dept}: ${bill.names}<i>${num_str(bill.price)}</i></span>`;
                        total += bill.price;
                    }
                    bills_unpaid += `<span class="fw-bold">Total unpaid: <i>TZS. ${num_str(total)}</i></span>`;
                    $("#print_bills_unpaid").html(bills_unpaid);
                } else {
                    var html = `<div class="text-center">No unpaid bills!</div>`;
                    $("#print_bills_unpaid").html(html);
                }

                // Hide the modal and trigger printing
                $("#dateFilterModal").modal('hide');
                window.print();
            } else {
                var alert = `<span class="alert alert-info w-100 d-block m-0 p-2">No records found in the specified dates!</span>`;
                $("#date_sms").html(alert).delay(4000).fadeOut('fast');
            }

            $("#date_filter_dismiss, #date_filter_clear").show('fast');
            $("#date_filter_btn").html("<i class='fas fa-check-circle'></i>");
        },
        error: function (xhr, status, error) {
            console.error(error);
        }
    });
});




function move_to_paypage(fnum) {
    window.location.href = "/reception/pay/p/"+fnum+"/";
}


$("#patients_pagination .pagination button").click(function (e) {
    var page = $(this).attr('href');
    var url_string = location.href;
    $("#patients_list_table").load(url_string+page + " #patients_list_table");
    $("#patients_pagination").load(url_string+page + " #patients_pagination");
});