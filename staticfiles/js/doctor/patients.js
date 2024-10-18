// switch tabs
$("#container ul li a").click(function (e) { 
    e.preventDefault();
    var tab_id = $(this).attr('href').replace('#','');
    $("#container .tab_container .tab_div").each(function () {
        if ($(this).is(':visible')) {
            if($(this).attr('id') !== tab_id) {
                $(this).css('display', 'none');
            }
        }
    });
    $('#' + tab_id).fadeIn('slow');
});

function open_section(div) {
    var next_section = $(div).nextAll('.sectionWrapper').first();
    next_section.slideToggle('fast');
}

// Get the CSRF token
var csrftoken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

// slideup elements passed in here
function closeup(id) {
    $("#container form .dropdownSelect").each(function (index, element) {
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
    for (let i=0; i<arr.length; i++) {
        const pair = arr[i];
        if (pair[0] === keyToDelete) {
            arr.splice(i, 1);
            return true;
        }
    }
    return false;
}

const ICD_CODES = [];
const SERVICES = [];
const DOCTORS = [];
const DESCRIPTIONS = [];

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
    var getPrice = $(el).parent().text().split(" - ");
    var price = getPrice[getPrice.length - 1].replace(" &nbsp; <i class='fas fa-times-circle' title='delete' onclick='del(this)'></i>", "");
    var totalamount_div = $("#container form .pay_list .totalcost span");
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
            html += `<div data-bs-toggle='modal' data-bs-target='#medicineModal' id='md_${item.id}'>`;
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

// retrieve medicine information
function get_medicine_info(medicine) {
    $("#md_qty").val('');
    $("#md_dosage").val('');
    $("#message_divbox").css("display","none");
    const id = medicine.replace('md_','');
    if (SERVICES.includes(parseInt(id))) {
        $("#medicineModal").modal('hide');
    } else {
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
    }
}

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

// add/remove icd code
function add_remove_icd_code(code) {
    var code_index = ICD_CODES.indexOf(code);
    var icd_div = $("#selected_icd_codes");
    if (code_index == -1) {
        ICD_CODES.push(code);
        if(icd_div.text().length == 0) {
            icd_div.text(code);
        } else {
            icd_div.append(", "+code);
        }
    } else {
        if(ICD_CODES.length == 1) {
            icd_div.text("");
        } else {
            var split_codes = icd_div.text().split(", ");
            if (split_codes[0] == code) {
                var new_txt = icd_div.text().replace(code+", ", "");
            } else {
                var new_txt = icd_div.text().replace(", "+code, "");
            }
            icd_div.text(new_txt)
        }
        ICD_CODES.splice(code_index, 1);
    }
}

// submit patient's diagnosis details
$("#patientDiagnosisForm").submit(function (e) { 
    e.preventDefault();
    var requestData = [];
    var patientNum = $("#patientFnumber").val();
    var review_sys = {};
    var pat_history = {};
    var fam_history = {};
    var physical_exam = {};
    var chief_complaint = $.trim($("#pat_oldcarts").val());
    var assessment = $.trim($("#pe_assessment").val());
    
    review_sys.constitutional = $.trim($("#pat_constit").val());
    review_sys.heent = $.trim($("#pat_heent").val());
    review_sys.skin_breast = $.trim($("#pat_skin_breast").val());
    review_sys.cardio = $.trim($("#pat_cardio").val());
    review_sys.pulmonary = $.trim($("#pat_pulmonary").val());
    review_sys.endocrine = $.trim($("#pat_endocrine").val());
    review_sys.gastro = $.trim($("#pat_gastro").val());
    review_sys.genitourinary = $.trim($("#pat_genitourinary").val());
    review_sys.musculoskeletal = $.trim($("#pat_musculoskeletal").val());
    review_sys.neurologic = $.trim($("#pat_neurologic").val());
    review_sys.heme_lymph = $.trim($("#pat_heme_lymph").val());
    review_sys.psychology = $.trim($("#pat_psychology").val());

    pat_history.med_history = $.trim($("#pat_pmh").val());
    pat_history.surg_history = $.trim($("#pat_psh").val());
    pat_history.meds = $.trim($("#pat_meds").val());
    pat_history.allergies = $.trim($("#pat_allergies").val());

    fam_history.history = $.trim($("#pat_hist_family").val());
    fam_history.drugs = $.trim($("#pat_hist_drugs").val());

    physical_exam.general = $.trim($("#pe_general").val());
    physical_exam.eyes = $.trim($("#pe_eyes").val());
    physical_exam.ent = $.trim($("#pe_ent").val());
    physical_exam.neck = $.trim($("#pe_neck").val());
    physical_exam.lymph = $.trim($("#pe_lymph").val());
    physical_exam.cardiovascular = $.trim($("#pe_cardiovascular").val());
    physical_exam.lungs = $.trim($("#pe_lungs").val());
    physical_exam.skin = $.trim($("#pe_skin").val());
    physical_exam.breast = $.trim($("#pe_breast").val());
    physical_exam.abdomen = $.trim($("#pe_abdomen").val());
    physical_exam.genitourinary = $.trim($("#pe_genitourinary").val());
    physical_exam.rectal = $.trim($("#pe_rectal").val());
    physical_exam.extreme = $.trim($("#pe_extreme").val());
    physical_exam.musculoskeletal = $.trim($("#pe_musculoskeletal").val());
    physical_exam.neuro = $.trim($("#pe_neuro").val());
    physical_exam.psychiatry = $.trim($("#pe_psychiatry").val());

    requestData.push(
        patientNum,
        chief_complaint,
        assessment,
        review_sys,
        pat_history,
        fam_history,
        physical_exam,
        ICD_CODES
    );

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
    $.ajax({
        type: 'POST',
        url: "/doc/diagnosis/save/",
        data: jsonData,
        dataType: 'json',
        contentType: 'application/json',
        headers: {
            'X-CSRFToken': csrftoken
        },
        beforeSend: function() {
            $("#diagnosis_sub_btn").html("<i class='fas fa-spinner fa-pulse'></i>");
            $("#diagnosis_sub_btn").attr('type','button');
        },
        success: function(response) {
            $("#diagnosis_sub_btn").html("Submit");
            $("#diagnosis_sub_btn").attr('type','submit');
            $('html, body').animate({ scrollTop: 0 }, 'slow');
            if(response.success) {
                $("#patientDiagnosisForm")[0].reset();
                $("#diagnosisFormsms").html("<span class='alert alert-success w-100 d-block m-0 py-2'><i class='fas fa-check-circle'></i> "+response.sms+"</span>").removeClass("d-none").addClass("d-block");
                SERVICES.splice(0, SERVICES.length);
                DOCTORS.splice(0, DOCTORS.length);
                DESCRIPTIONS.splice(0, DESCRIPTIONS.length);
                ICD_CODES.splice(0, ICD_CODES.length);
                $("#selected_icd_codes").text("");
                $("#container form .pay_list > :not(div.totalcost)").fadeOut('slow');
                setTimeout(function() {
                    $("#container form .pay_list > :not(div.totalcost)").remove();
                }, 500);
                $("#container form .pay_list div.totalcost b span").text(0);
                closeup('all');
            } else {
                $("#diagnosisFormsms").html("<span class='alert alert-danger w-100 d-block m-0 py-2'><i class='fas fa-exclamation-circle'></i> "+response.sms+"</span>").removeClass("d-none").addClass("d-block");
            }
            setTimeout(function() {
                $("#diagnosisFormsms").removeClass("d-block").addClass("d-none");
            }, 4000);
        },
        error: function(xhr, status, error) {
            console.log(error);
        }
    });
});

// retrieve test results/reports
function get_test_result_report(parent, span_id) {
    // $("#pat_results .results_div .details").each(function () {
    //     $(this).slideUp('fast');
    // });
    $(".details", parent).slideToggle('fast');

    if ($(".details", parent).text() == ""){
        var result = span_id.replace('result','');
        var formData = new FormData();
        formData.append("path", "results");
        formData.append("test_result", result);
        $.ajax({
            type: 'POST',
            url: "/doc/test/result-report/",
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
                    var rep = response.report_obj;
                    var html = "";
                    if (rep.dept == 3) {
                        var report_fields = rep.rows;
                        html += `<b>Order date:</b> &nbsp; <span>${rep.orderdate}</span><br>`;
                        html += `<b>Report date:</b> &nbsp; <span>${rep.reportdate}</span><br>`;
                        html += `<b>Reported by:</b> &nbsp; <span>${rep.reporter}</span>`;
                        html += `<div class="mb-3"></div>`;
                        html += `<b>Microscopic:</b> &nbsp; <span>${rep.micro.replace(/\n/g, '<br>')}</span><br>`;
                        html += `<b>Macroscopic:</b> &nbsp; <span>${rep.macro.replace(/\n/g, '<br>')}</span>`;
                        html += `<div class="mb-2"></div>`;
                        html += `<div class="border-bottom border-bblue text-bblue p-1">Report fields</div>`;
                        for (let y = 0; y < report_fields.length; y++) {
                            const row = report_fields[y];
                            html += `${y+1}. ${row.itemName}: &nbsp; <span>${row.itemValue}</span> &nbsp; Normal range: &nbsp; <span>${row.itemRange}</span>`;
                            if(report_fields.length > y+1) html += `<br>`;
                        }

                        html += `<div class="mb-2"></div>
                        <div class="mb-2"></div>
                        <div class="border-bottom border-bblue text-bblue p-1">Reporter's summary</div><span>${rep.report.replace(/\n/g, '<br>')}</span>`;

                        $(".details", parent).html(html);
                    } else if (rep.dept == 6) {
                        var plans = rep.plans;
                        html += `<b>Order date:</b> &nbsp; <span>${rep.orderdate}</span><br>`;
                        html += `<b>Report date:</b> &nbsp; <span>${rep.reportdate}</span><br>`;
                        html += `<b>Reported by:</b> &nbsp; <span>${rep.reporter}</span>`;
                        html += `<div class="mb-3"></div>`;
                        html += `<b>Description:</b> &nbsp; <span>${rep.rows.describe.replace(/\n/g, '<br>')}</span><br>`;
                        html += `<b>Findings:</b> &nbsp; <span>${rep.rows.findings.replace(/\n/g, '<br>')}</span><br>`;
                        html += `<b>Done:</b> &nbsp; <span>${rep.rows.done.replace(/\n/g, '<br>')}</span>`;
                        // html += `<div class="mb-2"></div>`;
                        // html += `<b>Report:</b> &nbsp; <span>${rep.report.replace(/\n/g, '<br>')}</span>`;
                        html += `<div class="mb-2"></div>`;
                        html += `<div class="border-bottom border-bblue text-bblue p-1">Plans ordered</div>`;
                        if(plans.length > 0) {
                            for (let x = 0; x < plans.length; x++) {
                                const row = plans[x];
                                html += `${x+1}. <span>${row.name} &nbsp; <b>Status:</b> ${row.status}</span>`;
                                if(plans.length > x+1) html += `<br>`;
                            }
                        } else {
                            html += `<div class="py-4 text-center"><i class='fas fa-info-circle'></i> No plans oredered after procedure!</div>`;
                        }
                        $(".details", parent).html(html);
                    } else if (rep.dept == 5) {
                        var report_fields = rep.rows;
                        html += `<b>Order date:</b> &nbsp; <span>${rep.orderdate}</span><br>`;
                        html += `<b>Report date:</b> &nbsp; <span>${rep.reportdate}</span><br>`;
                        html += `<b>Reported by:</b> &nbsp; <span>${rep.reporter}</span>`;
                        html += `<div class="mb-3"></div>`;
                        html += `<b>Report:</b> &nbsp; <span>${rep.report.replace(/\n/g, '<br>')}</span>`;
                        html += `<div class="mb-2"></div>`;
                        html += `<div class="border-bottom border-bblue text-bblue p-1">Report fields</div>`;
                        for (let y = 0; y < report_fields.length; y++) {
                            const row = report_fields[y];
                            html += `${y+1}. <b>${row.itemName}:</b> &nbsp; <span>${row.itemValue.replace(/\n/g, '<br>')}</span>`;
                            if(report_fields.length > y+1) html += `<br>`;
                        }
                        $(".details", parent).html(html);
                    } else {
                        html += `<b>Prescription date:</b> &nbsp; <span>${rep.orderdate}</span><br>`;
                        html += `<b>Serve date:</b> &nbsp; <span>${rep.reportdate}</span><br>`;
                        html += `<b>Served by:</b> &nbsp; <span>${rep.reporter}</span>`;
                        html += `<div class="mb-3"></div>`;
                        html += `<b>Quantity:</b> &nbsp; <span>${rep.qty}</span><br>`;
                        html += `<b>Formulation:</b> &nbsp; <span>${rep.form}</span><br>`;
                        html += `<b>Dosage:</b> &nbsp; <span>${rep.dosage.replace(/\n/g, '<br>')}</span>`;
                        $(".details", parent).html(html);
                    }
                } else {
                    var fdback = "<div class='text-center w-100 py-5 text-ttxt1'><i class='fas fa-exclamation-circle'></i> Failed to load test report!</div>";
                    $(".details", parent).html(fdback);
                }
            },
            error: function(xhr, status, error) {
                console.log(error);
            }
        });
    }
}

// retrieve past patient's history
function patient_history(parent, hist_date) {
    $(".details", parent).slideToggle('fast');

    if ($(".details", parent).text() == ""){
        var formData = new FormData();
        formData.append("path", "history");
        formData.append("diagnosis_date", hist_date);
        formData.append("patient", $("#patient_file_number").val());
        $.ajax({
            type: 'POST',
            url: "/doc/test/result-report/",
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
                    var reports = response.reports;
                    var html = ``;
                    for(let i = 0; i < reports.length; i++) {
                        var rep = reports[i];
                        html += `<div class="w-100 bg-bblue text-white text-center py-1 rounded">Report ${i+1}/${reports.length}</div>`;
                        html += `<b>Report date:</b> &nbsp; <span>${rep.dates}</span><br>`;
                        html += `<b>Doctor:</b> &nbsp; <span>${rep.doctor}</span>`;
                        html += `<div class="mb-3"></div>`;
                        html += `<b>Chief complaint:</b> &nbsp; <span>${rep.chief.replace(/\n/g, '<br>')}</span><br>`;
                        html += `<b>Assessment:</b> &nbsp; <span>${rep.assess.replace(/\n/g, '<br>')}</span>`;
                        
                        html += `<div class="w-100 border-bottom border-bblue text-bblue mt-3 ps-1">Systems review</div>`;
                        html += `<b>Constitutional:</b> &nbsp; <span>${rep.sys.constitutional.replace(/\n/g, '<br>')}</span><br>`;
                        html += `<b>Heent:</b> &nbsp; <span>${rep.sys.heent.replace(/\n/g, '<br>')}</span><br>`;
                        html += `<b>Skin/Breast:</b> &nbsp; <span>${rep.sys.skin_breast.replace(/\n/g, '<br>')}</span><br>`;
                        html += `<b>Cardiovascular:</b> &nbsp; <span>${rep.sys.cardio.replace(/\n/g, '<br>')}</span><br>`;
                        html += `<b>Pulmonary:</b> &nbsp; <span>${rep.sys.pulmonary.replace(/\n/g, '<br>')}</span><br>`;
                        html += `<b>Endocrine:</b> &nbsp; <span>${rep.sys.endocrine.replace(/\n/g, '<br>')}</span><br>`;
                        html += `<b>Gastro intestinal:</b> &nbsp; <span>${rep.sys.gastro.replace(/\n/g, '<br>')}</span><br>`;
                        html += `<b>Genitourinary:</b> &nbsp; <span>${rep.sys.genitourinary.replace(/\n/g, '<br>')}</span><br>`;
                        html += `<b>Musculoskeletal:</b> &nbsp; <span>${rep.sys.musculoskeletal.replace(/\n/g, '<br>')}</span><br>`;
                        html += `<b>Neurologic:</b> &nbsp; <span>${rep.sys.neurologic.replace(/\n/g, '<br>')}</span><br>`;
                        html += `<b>Heme/Lymph:</b> &nbsp; <span>${rep.sys.heme_lymph.replace(/\n/g, '<br>')}</span><br>`;
                        html += `<b>Psychology:</b> &nbsp; <span>${rep.sys.psychology.replace(/\n/g, '<br>')}</span>`;

                        html += `<div class="w-100 border-bottom border-bblue text-bblue mt-3 ps-1">Patient healthy history</div>`;
                        html += `<b>Patient medical history:</b> &nbsp; <span>${rep.hist.med_history.replace(/\n/g, '<br>')}</span><br>`;
                        html += `<b>Patient surgical history:</b> &nbsp; <span>${rep.hist.surg_history.replace(/\n/g, '<br>')}</span><br>`;
                        html += `<b>Medicines:</b> &nbsp; <span>${rep.hist.meds.replace(/\n/g, '<br>')}</span><br>`;
                        html += `<b>Allergies:</b> &nbsp; <span>${rep.hist.allergies.replace(/\n/g, '<br>')}</span>`;

                        html += `<div class="w-100 border-bottom border-bblue text-bblue mt-3 ps-1">Family & social medical history</div>`;
                        html += `<b>Family & social histroy:</b> &nbsp; <span>${rep.fam.history.replace(/\n/g, '<br>')}</span><br>`;
                        html += `<b>Drug use:</b> &nbsp; <span>${rep.fam.drugs.replace(/\n/g, '<br>')}</span><br>`;

                        html += `<div class="w-100 border-bottom border-bblue text-bblue mt-3 ps-1">Physical examination</div>`;
                        html += `<b>General:</b> &nbsp; <span>${rep.phy.general.replace(/\n/g, '<br>')}</span><br>`;
                        html += `<b>Eyes:</b> &nbsp; <span>${rep.phy.eyes.replace(/\n/g, '<br>')}</span><br>`;
                        html += `<b>ENT:</b> &nbsp; <span>${rep.phy.ent.replace(/\n/g, '<br>')}</span><br>`;
                        html += `<b>Neck:</b> &nbsp; <span>${rep.phy.neck.replace(/\n/g, '<br>')}</span><br>`;
                        html += `<b>Lymph nodes:</b> &nbsp; <span>${rep.phy.lymph.replace(/\n/g, '<br>')}</span><br>`;
                        html += `<b>Cardiovascular:</b> &nbsp; <span>${rep.phy.cardiovascular.replace(/\n/g, '<br>')}</span><br>`;
                        html += `<b>Lungs:</b> &nbsp; <span>${rep.phy.lungs.replace(/\n/g, '<br>')}</span><br>`;
                        html += `<b>Skin:</b> &nbsp; <span>${rep.phy.skin.replace(/\n/g, '<br>')}</span><br>`;
                        html += `<b>Breasts:</b> &nbsp; <span>${rep.phy.breast.replace(/\n/g, '<br>')}</span><br>`;
                        html += `<b>Abdomen:</b> &nbsp; <span>${rep.phy.abdomen.replace(/\n/g, '<br>')}</span><br>`;
                        html += `<b>Genitourinary:</b> &nbsp; <span>${rep.phy.genitourinary.replace(/\n/g, '<br>')}</span><br>`;
                        html += `<b>Rectal:</b> &nbsp; <span>${rep.phy.rectal.replace(/\n/g, '<br>')}</span><br>`;
                        html += `<b>Extremities:</b> &nbsp; <span>${rep.phy.extreme.replace(/\n/g, '<br>')}</span><br>`;
                        html += `<b>Musculoskeletal:</b> &nbsp; <span>${rep.phy.musculoskeletal.replace(/\n/g, '<br>')}</span><br>`;
                        html += `<b>Neurologic:</b> &nbsp; <span>${rep.phy.neuro.replace(/\n/g, '<br>')}</span><br>`;
                        html += `<b>Psychiatry:</b> &nbsp; <span>${rep.phy.psychiatry.replace(/\n/g, '<br>')}</span>`;

                        html += `<div class="w-100 border-bottom border-bblue text-bblue mt-3 ps-1">Diseases diagnosed</div>`;
                        if(rep.disease.length > 0) {
                            for(let x=0; x<rep.disease.length; x++) {
                                html += `<span>${x+1}. ${rep.disease[x].code} - ${rep.disease[x].describe}</span>`;
                                if(rep.disease.length > x+1) html += `<br>`;
                            }
                        } else {
                            html += `<span>No diseases listed!`;
                        }

                        html += `<div class="w-100 border-bottom border-bblue text-bblue mt-3 ps-1">Plans assigned</div>`;
                        if(rep.plans.length > 0) {
                            for(let y=0; y<rep.plans.length; y++) {
                                html += `<span id="pln_${rep.plans[y].id}">${y+1}. ${rep.plans[y].name} - ${rep.plans[y].status}</span>`;
                                if(rep.plans.length > y+1) html += `<br>`;
                            }
                        } else {
                            html += `<span>No plans listed!`;
                        }

                        html += `<div class="mb-3"></div>`;
                    }
                    $(".details", parent).html(html);
                } else {
                    var fdback = "<div class='text-center w-100 py-5 text-ttxt1'><i class='fas fa-exclamation-circle'></i> Failed to load test report!</div>";
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
    const clickedElement = e.target;
    const elementClicked = $(e.target);
    if (clickedElement.matches('#icd_wrapper .codes_div span')) {
        e.preventDefault();
        const span_text = clickedElement.textContent;
        var split_text = span_text.split(":");
        add_remove_icd_code(split_text[0]);
    } else if (clickedElement.matches("#medsWrapper .drop .contents div span")) {
        e.preventDefault();
        get_medicine_info(clickedElement.parentNode.id);
    } else if (clickedElement.matches("#pat_results .results_div .head")) {
        e.preventDefault();
        get_test_result_report(clickedElement.parentNode, clickedElement.id);
    } else if (clickedElement.matches("#pat_history .results_div .head")) {
        e.preventDefault();
        patient_history(clickedElement.parentNode, clickedElement.id);
    } else if (elementClicked.is('#container .patientlist .tab_container .pagination button')) {
        e.preventDefault();
        var currentScrollTop = $('html, body').scrollTop();
        var url_string = location.href + elementClicked.attr('href');
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
    } else if (elementClicked.is('#pat_history .pagination button')) {
        e.preventDefault();
        var currentScrollTop = $('html, body').scrollTop();
        var url_string = location.href + elementClicked.attr('href');
        $("#pat_history .results_div").load(url_string + " #pat_history .results_div", function () {
            $('html, body').scrollTop(currentScrollTop);
        });
        $("#pat_history .paging_info").load(url_string + " #pat_history .paging_info", function () {
            $('html, body').scrollTop(currentScrollTop);
        });
    } else if (elementClicked.is('#pat_results .pagination button')) {
        e.preventDefault();
        var currentScrollTop = $('html, body').scrollTop();
        var url_string = location.href + elementClicked.attr('href');
        var parent_id = elementClicked.parent().parent().parent().attr('id');
        var div_id = "";
        if(parent_id == "pendlist_pagenation") {
            div_id = "unread_list_div";
        } else if(parent_id == "seenlist_pagenation") {
            div_id = "seen_list_div";
        } else {
            div_id = "table_pharmacy";
        }
        // console.log("Parent id: "+parent_id);
        $("#"+div_id).load(url_string + " #"+div_id);
        $("#"+parent_id).load(url_string + " #"+parent_id);
    } else if (elementClicked.is('#resultlist_pagination .pagination button')) {
        e.preventDefault();
        var currentScrollTop = $('html, body').scrollTop();
        var url_string = location.href + elementClicked.attr('href');
        var search_val = $.trim($("#search_results_input").val());
        
        if(search_val.length > 0) url_string = url_string + "&search=" + search_val;
        $("#table_results_list").load(url_string + " #table_results_list", function () {
            $('html, body').scrollTop(currentScrollTop);
        });
        $("#resultlist_pagination").load(url_string + " #resultlist_pagination", function () {
            $('html, body').scrollTop(currentScrollTop);
        });
    }
});

$("#results_input_grp button").click(function (e) {
    if($(this).attr('class').indexOf('reload_table') !== -1) {
        $("#search_results_input").val("");
        var url_string = location.href;
        $("#table_results_list").load(url_string + " #table_results_list");
        $("#resultlist_pagination").load(url_string + " #resultlist_pagination");
    } else {
        var search_str = $.trim($("#search_results_input").val());
        if (search_str.length == 0) {
            $("#search_results_input").val("");
            var url_string = location.href;
            $("#table_results_list").load(url_string + " #table_results_list");
            $("#resultlist_pagination").load(url_string + " #resultlist_pagination");
        } else {
            var url_string = location.href;
            if (url_string.indexOf("?") !== -1) {
                url_string = url_string+"&search="+search_str;
            } else {
                url_string = url_string+"?search="+search_str;
            }

            $("#table_results_list").load(url_string + " #table_results_list");
            $("#resultlist_pagination").load(url_string + " #resultlist_pagination");
        }
    }
});

$("#icd_search").keyup(function (e) { 
    var qry_str = $.trim($(this).val());
    const formData = new FormData();
    formData.append("query", qry_str);
    formData.append("context", "icd_10_codes");

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
            $("#icd_wrapper .searching").fadeIn('fast');
        },
        success: function(response) {
            var contents = $("#icd_wrapper .codes_div");
            var result_set = response.results;
            if (result_set.length > 0) {
                var html = "";
                var pulse = `<span class='searching'>Searching..<i class='fas fa-spinner fa-pulse'></i></span>`;
                for (let y = 0; y < result_set.length; y++) {
                    var item = result_set[y];
                    html += `<span class='rounded'>${item.code}: ${item.describe}</span>`;
                }
                contents.html(html+pulse);
            } else {
                contents.html(`<div class='d-block w-100 py-4 text-center' style='font-size:15px'>No results found!</div>`);
            }
        },
        error: function(xhr, status, error) {
            console.error(error);
        }
    });
});

function move_to_page(num) {
    window.location.href = "/doc/patients/p/"+num+"/";
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

$("#reload_button").click(function (e) {
    e.preventDefault();
    $("#patient_id_number").val("");
    var url_string = location.href;
    $("#patients_list_table").load(url_string + " #patients_list_table");
    $("#patients_pagination").load(url_string + " #patients_pagination");
});