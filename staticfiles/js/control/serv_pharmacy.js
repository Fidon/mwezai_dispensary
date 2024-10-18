$("#servicesBtn").click();

$("#container .medicine_info ul li a").click(function (e) { 
    e.preventDefault();
    var tab_id = $(this).attr('href').replace('#','');
    $("#container .medicine_info .tab_container .tab_div").each(function () {
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

$(function () {
    var formula = $("#none_form").text();
    $("#up_formula option").each(function () {
        $(this).attr('selected',false);
        if($(this).attr('value') == formula) {
            $(this).attr('selected',true);
        }
    });
    $("#up_formula").change();

    // Get the CSRF token
    var csrftoken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');


    // function to get startdate and enddate from their inputs
    function get_dates(dt, input_id) {
        const mindate = $('#'+input_id).val();
        const maxdate = $('#'+input_id).val();
        let dt_start = "";
        let dt_end = "";
        if (mindate) dt_start = mindate + ' 00:00:00.000000';
        if (maxdate) dt_end = maxdate + ' 23:59:59.999999';
        return (dt === 0) ? dt_start : dt_end;
    }
    

    // ------------ dataTabales library config -----------------
    $("#meds_table thead tr").clone(true).attr('class','filters').appendTo('#meds_table thead');
    var table = $("#meds_table").DataTable({
        fixedHeader: true,
        processing: true,
        serverSide: true,
        ajax: {
            url: "/manage/retrieve_data/param/medicines/",
            type: "POST",
            data: function (d) {
                d.reg_mindate = get_dates(0, "min_date");
                d.reg_maxdate = get_dates(1, "max_date");
                d.exp_mindate = get_dates(0, "expiry_start");
                d.exp_maxdate = get_dates(1, "expiry_end");
            },
            dataType: 'json',
            headers: { 'X-CSRFToken': csrftoken },
        },
        columns: [
            { data: 'count' },
            { data: 'regdate' },
            { data: 'expirydate' },
            { data: 'names' },
            { data: 'price' },
            { data: 'qty' },
            { data: 'formulation' },
            { data: 'status' },
            { data: 'action' },
            { data: 'exp' }
        ],
        order: [[3, 'asc']],
        paging: true,
        pageLength: 10,
        lengthChange: true,
        autoWidth: true,
        searching: true,
        bInfo: true,
        bSort: true,
        orderCellsTop: true,
        columnDefs: [{
            targets: [0, 8],
            orderable: false
        },
        {
            targets: 9,
            visible: false,
        },
        {
            targets: 2,
            createdCell: function (cell, cellData, rowData, rowIndex, colIndex) {
                $(cell).attr("data-bs-toggle","tooltip");
                if((rowData.exp >= 1) && (rowData.exp <= 14)) {
                    $(cell).addClass("bg-warning text-white");
                    $(cell).attr("title",rowData.exp+" days remaining");
                } else if(rowData.exp <= 0) {
                    $(cell).addClass("bg-danger text-white");
                    $(cell).attr("title","Expired "+rowData.exp+" days ago");
                } else {
                    $(cell).addClass("bg-success text-white");
                    $(cell).attr("title","Expires in "+rowData.exp+" days");
                }
            }
        },
        {
            targets: 7,
            createdCell: function (cell, cellData, rowData, rowIndex, colIndex) {
                if (cellData === "Hidden") {
                    $(cell).addClass('text-danger');
                } else {
                    $(cell).addClass('text-success');
                }
            }
        },
        {
            targets: 8,
            createdCell: function (cell, cellData, rowData, rowIndex, colIndex) {
                var cell_content =`<a href="/manage/pharmacy/m/${rowData.id}/" class="btn btn-bblue text-white">view</a>`;
                $(cell).html(cell_content);
            }
        },
        {
            targets: "_all",
            className: 'align-middle text-nowrap text-center',
        }],
        dom: "lBfrtip",
        buttons: [
            { // Copy button
                extend: "copy",
                text: "<i class='fas fa-clone'></i>",
                className: "btn btn-bblue text-white",
                titleAttr: "Copy",
                title: "Medicines - Mwezai dispensary",
                exportOptions: {
                    columns: [0, 1, 2, 3, 4, 5, 6, 7]
                }
            },
            { // PDF button
                extend: "pdf",
                text: "<i class='fas fa-file-pdf'></i>",
                className: "btn btn-bblue text-white",
                titleAttr: "Export to PDF",
                title: "Medicines - Mwezai dispensary",
                exportOptions: {
                    columns: [0, 1, 2, 3, 4, 5, 6, 7]
                },
                tableHeader: {
                    alignment: "center"
                },
                customize: function(doc) {
                    doc.styles.tableHeader.alignment = "center";
                    doc.styles.tableBodyOdd.alignment = "center";
                    doc.styles.tableBodyEven.alignment = "center";
                    doc.styles.tableHeader.fontSize = 7;
                    doc.defaultStyle.fontSize = 6;
                    doc.content[1].table.widths = Array(doc.content[1].table.body[1].length + 1).join('*').split('');

                    var rowCount = doc.content[1].table.body.length;
                    for (i = 1; i < rowCount; i++) {
                        doc.content[1].table.body[i][2].alignment = 'left';
                        doc.content[1].table.body[i][3].alignment = 'left';
                    }

                    const today = new Date();
                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
                    const day = (today.getDate() < 10) ? '0'+today.getDate() : today.getDate();
                    const hours = (today.getHours() < 10) ? '0'+today.getHours() : today.getHours();
                    const minutes = (today.getMinutes() < 10) ? '0'+today.getMinutes() : today.getMinutes();
                const jsDate = `${day}-${months[today.getMonth()]}-${today.getFullYear()} ${hours}:${minutes}`;
                    doc['footer']=(function(page, pages) {
                        return {
                            columns: [{
                                alignment: 'left',
                                text: ['Printed on: ', { text: jsDate.toString() }]
                            },
                            {
                                alignment: 'right',
                                text: ['Page', { text: page.toString() },' of ', { text: pages.toString() }]
                            }],
                            margin: 20
                        };
                    });
                }
            },
            { // Export to excel button
                extend: "excel",
                text: "<i class='fas fa-file-excel'></i>",
                className: "btn btn-bblue text-white",
                titleAttr: "Export to Excel",
                title: "Medicines - Mwezai dispensary",
                exportOptions: {
                    columns: [0, 1, 2, 3, 4, 5, 6, 7]
                }
            },
            { // Print button
                extend: "print",
                text: "<i class='fas fa-print'></i>",
                className: "btn btn-bblue text-white",
                title: "Medicines - Mwezai dispensary",
                titleAttr: "Print",
                exportOptions: {
                    columns: [0, 1, 2, 3, 4, 5, 6, 7]
                },
                customize: function (win) {
                    $(win.document.body).css("font-size","11pt");
                    $(win.document.body).find("table").addClass("compact").css("font-size","inherit");
                }
            }
        ],
        initComplete: function() {
            var api = this.api();
            api.columns([0, 1, 2, 3, 4, 5, 6, 7, 8]).eq(0).each(function (colIdx) {
                var cell = $(".filters th").eq($(api.column(colIdx).header()).index());
                var title = $(cell).text();
                $(cell).attr('class','text-center')
                if (colIdx == 1) {
                    var calendar =`<button type="button" class="btn btn-sm btn-bblue text-white" data-bs-toggle="modal" data-bs-target="#dateFilterModal"><i class="fas fa-calendar-alt"></i></button>`;
                    cell.html(calendar);
                    $("#date_filter_clear").on("click", function() {
                        $("#min_date").val("");
                        $("#max_date").val("");
                    });
                    $("#date_filter_btn").on("click", function() {
                        table.draw();
                    });
                } else if (colIdx == 2) {
                    var calendar =`<button type="button" class="btn btn-sm btn-bblue text-white" data-bs-toggle="modal" data-bs-target="#expirydate_Modal"><i class="fas fa-calendar-alt"></i></button>`;
                    cell.html(calendar);
                    $("#expiry_clear").on("click", function() {
                        $("#expiry_start").val("");
                        $("#expiry_end").val("");
                    });
                    $("#expiry_btn").on("click", function() {
                        table.draw();
                    });
                } else if (colIdx == 6) {
                    var select = document.createElement("select");
                    select.className = "select-filter text-ttxt1";
                    select.innerHTML = `<option value="">All</option>` +
                    `<option value="lab_use">Labolatory use</option>` +
                    `<option value="Syrup">Syrup</option>` +
                    `<option value="Tablet">Tablet</option>` +
                    `<option value="Suppository">Suppository</option>` +
                    `<option value="Pessary">Pessary</option>` +
                    `<option value="Injection">Injection</option>` +
                    `<option value="Others">Others</option></select>`;
                    cell.html(select);
                    
                    // Add change event listener to the select
                    $(select).on("change", function() {
                        var selectedValue = $(this).val();
                        api.column(colIdx).search(selectedValue).draw();
                    });
                } else if (colIdx == 7) {
                    var select = document.createElement("select");
                    select.className = "select-filter text-ttxt1";
                    select.innerHTML = `<option value="">All</option>` +
                    `<option value="0">Active</option>` +
                    `<option value="1">Hidden</option></select>`;
                    cell.html(select);
                    
                    // Add change event listener to the select
                    $(select).on("change", function() {
                        var selectedValue = $(this).val();
                        api.column(colIdx).search(selectedValue).draw();
                    });
                } else if ((colIdx == 0) || (colIdx == 8)) {
                    cell.html("");
                } else {
                    $(cell).html("<input type='text' class='text-ttxt1' placeholder='"+title+"'/>");
                    $("input", $(".filters th").eq($(api.column(colIdx).header()).index()))
                    .off("keyup change").on("keyup change", function(e) {
                        e.stopPropagation();
                        $(this).attr('title', $(this).val());
                        var regexr = "{search}";
                        var cursorPosition = this.selectionStart;
                        api.column(colIdx).search(
                            this.value != '' ? regexr.replace('{search}', this.value) : '',
                            this.value != '',
                            this.value == ''
                            ).draw();
                        $(this).focus()[0].setSelectionRange(cursorPosition, cursorPosition);
                    });
                }
            });
        }
    });
    
    $("#search_med_inpt").keyup(function() {
        table.search($(this).val()).draw();
    });

    $('[data-bs-toggle="tooltip"]').tooltip();
});

// add new medicine
$('#newMedicineForm').submit(function(e) {
    e.preventDefault();
    var form_sms = $("#med_formsms");
    var names = $.trim($("#inp_name").val());
    var formula = $("#inp_formula").val();
    var price = $.trim($("#inp_price").val());
    var expiry = $("#inp_expiry").val();
    var qty = $.trim($("#inp_qty").val());
    var get_desc = $.trim($("#inp_describe").val());
    if(get_desc.length == 0){ var describe="-"; } else { var describe = get_desc; }

    var formData = new FormData();
    formData.append("names", names);
    formData.append("formula", formula);
    formData.append("price", price);
    formData.append("qty", qty);
    formData.append("expiry", expiry);
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
            $("#new_med_btn").html("<i class='fas fa-spinner fa-pulse'></i>");
            $("#new_med_btn").attr('type','button');
        },
        success: function(response) {
            $("#new_med_btn").text("Add");
            $("#new_med_btn").attr('type','submit');
            $("html, body, #newMedicineForm, #newMedicineForm .modal-body").animate({ scrollTop: 0 }, 'slow');
            if(response.success) {
                $(form_sms).html("<span class='py-2 alert alert-success'><i class='fas fa-check-circle'></i> "+response.sms+"</span>").slideDown('fast').delay(3000).slideUp('fast');
                $("#newMedicineForm")[0].reset();
                $("#container table").load(location.href+" #container table");
            } else {
                $(form_sms).html("<span class='py-2 alert alert-danger'><i class='fas fa-exclamation-circle'></i> "+response.sms+"</span>").slideDown('fast').delay(3000).slideUp('fast');
            }
        },
        error: function(xhr, status, error) {
            console.log(error);
        }
    });
});

// Update medicine information
$('#updateMedicineForm').submit(function(e) {
    e.preventDefault();
    var form_sms = $("#medupdate_formsms");
    var names = $.trim($("#up_name").val());
    var formula = $("#up_formula").val();
    var price = $.trim($("#up_price").val());
    var expiry = $("#up_expiry").val();
    var get_qty = $.trim($("#up_qty").val());
    var get_desc = $.trim($("#up_describe").val());
    if((get_qty.length == 0) || (get_qty <= 0)){ var qty=0; } else { var qty = get_qty; }
    if(get_desc.length == 0){ var describe="-"; } else { var describe = get_desc; }

    var formData = new FormData();
    formData.append("id", $("#up_medicine_id").val());
    formData.append("update", "update");
    formData.append("names", names);
    formData.append("formula", formula);
    formData.append("price", price);
    formData.append("qty", qty);
    formData.append("expiry", expiry);
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
            $("#med_up_btn").html("<i class='fas fa-spinner fa-pulse'></i>");
            $("#med_up_btn").attr('type','button');
        },
        success: function(response) {
            $("#med_up_btn").text("Update");
            $("#med_up_btn").attr('type','submit');
            $("html, body, #updateMedicineForm").animate({ scrollTop: 0 }, 'slow');
            if(response.success) {
                $(form_sms).html("<span class='py-2 alert alert-success'><i class='fas fa-check-circle'></i> "+response.sms+"</span>").slideDown('fast').delay(3000).slideUp('fast');
                $("#medicineInfo").load(location.href+" #medicineInfo");
            } else {
                $(form_sms).html("<span class='py-2 alert alert-danger'><i class='fas fa-exclamation-circle'></i> "+response.sms+"</span>").slideDown('fast').delay(3000).slideUp('fast');
            }
        },
        error: function(xhr, status, error) {
            console.log(error);
        }
    });
});


document.addEventListener('click', e => {
    const clickedElement = $(e.target);
    if (clickedElement.is('#med_del_btn')) {
        e.preventDefault();
        var formData = new FormData();
        formData.append("id", $("#up_medicine_id").val());
        formData.append("update", "delete");
        $.ajax({
            type: 'POST',
            url: $("#updateMedicineForm").attr('action'),
            data: formData,
            dataType: 'json',
            contentType: false,
            processData: false,
            headers: {
                'X-CSRFToken': csrftoken
            },
            beforeSend: function() {
                $("#med_del_btn").html("<i class='fas fa-spinner fa-pulse'></i>");
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
    } else if (clickedElement.is('#hide_med_btn')) {
        e.preventDefault();
        var formData = new FormData();
        formData.append("id", $("#up_medicine_id").val());
        formData.append("update", "hide");
        $.ajax({
            type: 'POST',
            url: $("#updateMedicineForm").attr('action'),
            data: formData,
            dataType: 'json',
            contentType: false,
            processData: false,
            headers: {
                'X-CSRFToken': csrftoken
            },
            beforeSend: function() {
                $("#hide_med_btn").html("<i class='fas fa-spinner fa-pulse'></i>");
            },
            success: function(response) {
                if(response.success) {
                    $("#medicineInfo").load(location.href+" #medicineInfo");
                }
            },
            error: function(xhr, status, error) {
                console.log(error);
            }
        });
    }
});

// delete this particular medicine
// $("#med_del_btn").click(function (e) { 
//     e.preventDefault();
//     var formData = new FormData();
//     formData.append("id", $("#up_medicine_id").val());
//     formData.append("update", "delete");
//     $.ajax({
//         type: 'POST',
//         url: $("#updateMedicineForm").attr('action'),
//         data: formData,
//         dataType: 'json',
//         contentType: false,
//         processData: false,
//         headers: {
//             'X-CSRFToken': csrftoken
//         },
//         beforeSend: function() {
//             $("#med_del_btn").html("<i class='fas fa-spinner fa-pulse'></i>");
//         },
//         success: function(response) {
//             if(response.success) {
//                 window.history.back();
//             }
//         },
//         error: function(xhr, status, error) {
//             console.log(error);
//         }
//     });
// });

// // hide this particular medicine
// $("#hide_med_btn").click(function (e) { 
//     e.preventDefault();
//     var formData = new FormData();
//     formData.append("id", $("#up_medicine_id").val());
//     formData.append("update", "hide");
//     $.ajax({
//         type: 'POST',
//         url: $("#updateMedicineForm").attr('action'),
//         data: formData,
//         dataType: 'json',
//         contentType: false,
//         processData: false,
//         headers: {
//             'X-CSRFToken': csrftoken
//         },
//         beforeSend: function() {
//             $("#hide_med_btn").html("<i class='fas fa-spinner fa-pulse'></i>");
//         },
//         success: function(response) {
//             if(response.success) {
//                 $("#medicineInfo").load(location.href+" #medicineInfo");
//             }
//         },
//         error: function(xhr, status, error) {
//             console.log(error);
//         }
//     });
// });
