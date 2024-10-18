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

$("#proListTable tbody tr").click(function (e) { 
    e.preventDefault();
    $("#procedure_num").val($(this).attr('id'));
    $("#proReportForm").modal({ backdrop: 'static', keyboard: false });
    $("#proReportForm").modal('show');

    $("#type").text($(".name", this).text());
    $("#ordered").text($(".order", this).text());
    var describe = $(".d-none", this).html().replace(/<br>/g, '\n').replace(/<\/?[^>]+(>|$)/g, '');
    $("#pro_description").val(describe);
    $("#report_sub_btn").attr('type','submit');
});

$("#pro_cancel_btn").click(function (e){
    var tbody = $("#proListTable tbody");
    var new_tr = `<tr><td colspan="3" class="text-center py-4">No pending procedures for this patient!</td></tr>`;
    tbody.append(new_tr);
});

// slideup elements passed in here
function closeup(id) {
    $("#proReportForm .dropdownSelect").each(function (index, element) {
        if($(this).attr('id') !== id) {
            if ($(this).is(':visible')) {
                $(this).slideUp('fast');
            }
            $(".drop", this).slideUp('fast');
        }
    });
}

// Change form input fields based on service selected
$("#selectService").change(function (e) {
    e.preventDefault();
    var service = $("option:selected", this).text().toLowerCase();
    
    if((service.indexOf("labolatory") !== -1) || ((service.indexOf("pharmacy") !== -1))) {
        if(service.indexOf("labolatory") !== -1) {
            $("#labWrapper").slideDown('fast');
            closeup('labWrapper');
        } else {
            $("#medsWrapper").slideDown('fast');
            closeup('medsWrapper');
        }
    } else {
        if($(this).val() !== "") {
            if(service.indexOf("doctor") !== -1) {
                $("#docWrapper").slideDown('fast');
                closeup('docWrapper');
            } else if(service.indexOf("procedure") !== -1) {
                $("#procedureWrapper").slideDown('fast');
                closeup('procedureWrapper');
            } else if(service.indexOf("ultrasound") !== -1) {
                $("#ultraWrapper").slideDown('fast');
                closeup('ultraWrapper');
            }
        } else {
            closeup('all');
        }
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
    for (let i = 0; i < arr.length; i++) {
        const pair = arr[i];
        if (pair[0] === keyToDelete) {
            arr.splice(i, 1);
            return true;
        }
    }
    return false;
}

const SERVICES = [];
const DOCTORS = [];
const DESCRIPTIONS = [];
function add_items(value, categ) {
    if (categ == "doc") {
        if (!DOCTORS.includes(value)) {
            DOCTORS.push(value);
            return true;
        } else {
            return false;
        }
    } else {
        if (!SERVICES.includes(value)) {
            SERVICES.push(value);
            if(categ == "med") {
                var desc = ($.trim($("#md_dosage").val()).length == 0) ? " - " : $.trim($("#md_dosage").val());
                var medic_qty = $("#md_qty").val();
                var medic_form = $("#md_formula").val();
                DESCRIPTIONS.push([value, medic_qty, medic_form, desc]);
            }
            return true;
        } else {
            return false;
        }
    }
}

// add item to pending payments list
function add_payment(id, serv, el, item_id) {
    var testTxt = "";
    if( serv == "doctor") {
        testTxt = "doc";
    } else if(serv == "pharmacy") {
        testTxt = "med";
    } else {
        testTxt = "others";
    }

    const addItem = add_items(item_id, testTxt);
    if(addItem) {
        if(serv.toLowerCase() == "pharmacy") {
            var qty = ($("#md_qty").val() > 0) ? $("#md_qty").val() : 1;
            var getprice = $("#mdTotal").text();
            var names = $("#md_name").val()+" ("+$("#md_formula").val()+")";
            var cost = str_num(getprice);
        } else {
            if(serv.toLowerCase() == "doctor") {
                var getprice = $('b', el).text();
            } else {
                var getprice = $(".price", el).text();
            }
            var names = $(".name", el).text();
            var cost = str_num(getprice);
        }
        var service_div = $("#proReportForm .pay_list .serv_"+id);
        var totalamount_div = $("#proReportForm .pay_list .totalcost span");
        var new_price = eval(cost + str_num(totalamount_div.text()));
        if(service_div.length > 0) {
            if(serv.toLowerCase() == "pharmacy") {
                var newItem = "<span id='"+item_id+"-"+serv+"'>--> "+names+" x "+qty+" - "+getprice+" &nbsp; <i class='fas fa-times-circle' title='delete' onclick='del(this)'></i></span>";
            } else {
                var newItem = "<span id='"+item_id+"-"+serv+"'>--> "+names+" - "+getprice+" &nbsp; <i class='fas fa-times-circle' title='delete' onclick='del(this)'></i></span>";
            }
            service_div.append(newItem);
        } else {
            var txt = serv.charAt(0).toUpperCase() + serv.slice(1).toLowerCase();
            var payDiv = $("#proReportForm .pay_list");
            if(serv.toLowerCase() == "pharmacy") {
                var newItem = "<div class='serv_"+id+"'><b>"+txt+":</b><br>";
                newItem += "<span id='"+item_id+"-"+serv+"'>--> "+names+" x "+qty+" - "+getprice+" &nbsp; <i class='fas fa-times-circle' title='delete' onclick='del(this)'></i></span></div>";
            } else {
                var newItem = "<div class='serv_"+id+"'><b>"+txt+":</b><br>";
                newItem += "<span id='"+item_id+"-"+serv+"'>--> "+names+" - "+getprice+" &nbsp; <i class='fas fa-times-circle' title='delete' onclick='del(this)'></i></span></div>";
            }
            payDiv.prepend(newItem);
        }
        totalamount_div.text(num_str(new_price));
        
        var submit_div = $("#formsubmit_btn_div");
        if (submit_div.css('display') == 'none') submit_div.slideDown('fast');
    } else {
        console.log(item_id+" exists in "+testTxt);
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
    var getPrice = $(el).parent().text().split(" - ");
    var price = getPrice[getPrice.length - 1].replace(" &nbsp; <i class='fas fa-times-circle' title='delete' onclick='del(this)'></i>", "");
    var totalamount_div = $("#proReportForm .pay_list .totalcost span");
    var newTotal = eval(str_num(totalamount_div.text()) - str_num(price));
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
    
    if (str_num(totalamount_div.text()) == 0) $("#formsubmit_btn_div").slideUp('fast');
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
            html += `<div onclick="view_med(this)" data-bs-target='#medicineModal' data-bs-toggle='modal' data-bs-dismiss='modal' id='md_${item.id}'>`;
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

// submit procedure report
$("#proReportForm").submit(function (e) { 
    e.preventDefault();
    var requestData = [];
    var rows = {};
    var patientNum = $("#patientFnumber").val();
    var id = $("#procedure_num").val();
    var tests = [];
    
    rows.describe = $.trim($("#pro_description").val());
    rows.findings = $.trim($("#pro_findings").val());
    rows.done = $.trim($("#pro_done").val());

    for (let x = 0; x < SERVICES.length; x++) {
        var rowData = {};
        rowData.patient = patientNum;
        rowData.service = SERVICES[x];
        rowData.doctor_service = '0';
        rowData.doctor = '0';
        for (let y = 0; y < DESCRIPTIONS.length; y++) {
            const pair = DESCRIPTIONS[y];
            if (pair[0] === SERVICES[x]) {
                rowData.md_qty = pair[1];
                rowData.md_form = pair[2];
                rowData.md_dosage = pair[3];
            }
        }
        tests.push(rowData);
    }
    for (let x = 0; x < DOCTORS.length; x++) {
        var rowData = {};
        rowData.patient = patientNum;
        rowData.service = '0';
        rowData.doctor_service = '1';
        rowData.doctor = DOCTORS[x];
        rowData.md_qty = '0';
        rowData.md_form = '0';
        rowData.md_dosage = '0';
        tests.push(rowData);
    }

    requestData.push(parseInt(id), rows, tests);
    var jsonData = JSON.stringify(requestData);

    $.ajax({
        type: 'POST',
        url: "/procedure/report/save/",
        data: jsonData,
        dataType: 'json',
        contentType: 'application/json',
        headers: {
            'X-CSRFToken': csrftoken
        },
        beforeSend: function() {
            $("#report_sub_btn").html("<i class='fas fa-spinner fa-pulse'></i>");
            $("#report_sub_btn").attr('type','button');
            $("#pro_cancel_btn").attr('data-bs-dismiss','');
        },
        success: function(response) {
            $("#report_sub_btn").html("Submit");
            $("#pro_cancel_btn").attr('data-bs-dismiss','modal');
            $('html, body, #proReportForm').animate({ scrollTop: 0 }, 'slow');
            if(response.success) {
                $("#proReportForm")[0].reset();
                $("#proErrsms").html("<span class='alert alert-success w-100 d-block m-0 py-2'><i class='fas fa-check-circle'></i> "+response.sms+"</span>").slideDown('fast').delay(4000).slideUp('fast');
                $("#"+id).slideUp('fast');
                SERVICES.splice(0, SERVICES.length);
                DOCTORS.splice(0, DOCTORS.length);
                DESCRIPTIONS.splice(0, DESCRIPTIONS.length);
                $("#proReportForm .pay_list > :not(div.totalcost)").fadeOut('slow');
                setTimeout(function() {
                    $("#proReportForm .pay_list > :not(div.totalcost)").remove();
                    $("#"+id).remove();
                }, 700);
                $("#proReportForm .pay_list div.totalcost b span").text(0);
                closeup('all');
            } else {
                $("#proErrsms").html("<span class='alert alert-danger w-100 d-block m-0 py-2'><i class='fas fa-exclamation-circle'></i> "+response.sms+"</span>").slideDown('fast').delay(4000).slideUp('fast');
            }
        },
        error: function(xhr, status, error) {
            console.log(error);
        }
    });
});


function move_to_page(num) {
    window.location.href = "/procedure/patients/p/"+num+"/";
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
            url: "/procedure/patient/history/",
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
                        var report_plans = hist.plans;
                        html += `<div class="w-100 bg-bblue text-white text-center py-1 rounded">Report ${i+1}/${date_history.length}</div>
                        <b>Test name:</b> &nbsp; <span>${hist.pro_name}</span><br>
                        <b>Order date:</b> &nbsp; <span>${hist.orderdate}</span><br>
                        <b>Ordered by:</b> &nbsp; <span>${hist.ordered_by}</span><br>
                        <b>Report date:</b> &nbsp; <span>${hist.reportdate}</span><br>
                        <b>Reported by:</b> &nbsp; <span>${hist.reporter}</span><br>
                        <b>Service cost:</b> &nbsp; <span>${hist.cost}</span>
                        <div class="mb-3"></div>
                        <b>Description:</b> &nbsp; <span>${hist.describe.replace(/\n/g, '<br>')}</span><br><br>
                        <b>Findings:</b> &nbsp; <span>${hist.findings.replace(/\n/g, '<br>')}</span><br><br>
                        <b>Done:</b> &nbsp; <span>${hist.done.replace(/\n/g, '<br>')}</span><br>
                        <div class="mb-2"></div>
                        
                        <div class="border-bottom border-bblue text-bblue p-1">Plans/new tests assigned</div>`;
                        for (let y = 0; y < report_plans.length; y++) {
                            const plan = report_plans[y];
                            html += `${y+1}. <span>${plan.name} &nbsp; <b>Status:</b> ${plan.status}</span>`;
                            if(report_plans.length > y+1) html += `<br>`;
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