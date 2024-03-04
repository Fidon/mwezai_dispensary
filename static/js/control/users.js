$(function () {
    $("#container .info_user ul li a").click(function (e) { 
        e.preventDefault();
        var tab_id = $(this).attr('href').replace('#','');
        $("#container .info_user .tab_container .tab_div").each(function () {
            if ($(this).is(':visible')) {
                if($(this).attr('id') !== tab_id) {
                    $(this).css('display','none');
                    $('#'+tab_id).fadeIn('slow');
                }
            }
        });
    });

    var depart_id = $("#current_depart_id").val();
    $("#ed_department option").each(function () {
        $(this).attr('selected',false);
        if($(this).attr('value') == depart_id) {
            $(this).attr('selected',true);
        }
    });
    $("#ed_department").change();

    $("#ed_gender option").each(function () {
        $(this).attr('selected',false);
        if($(this).attr('value') == $("#current_gender").val()) {
            $(this).attr('selected',true);
        }
    });
    $("#ed_gender").change();


    // function to get startdate and enddate from their inputs
    function get_dates(dt) {
        const mindate = $('#min_date').val();
        const maxdate = $('#max_date').val();
        let dt_start = "";
        let dt_end = "";
        if (mindate) dt_start = mindate + ' 00:00:00.000000';
        if (maxdate) dt_end = maxdate + ' 23:59:59.999999';
        return (dt === 0) ? dt_start : dt_end;
    }

    // ------------ dataTabales library config -----------------
    $("#users_table thead tr").clone(true).attr('class','filters').appendTo('#users_table thead');
    var table = $("#users_table").DataTable({
        fixedHeader: true,
        processing: true,
        serverSide: true,
        ajax: {
            url: "/manage/retrieve_data/param/users/",
            type: "POST",
            data: function (d) {
                d.mindate = get_dates(0);
                d.maxdate = get_dates(1);
            },
            dataType: 'json',
            headers: { 'X-CSRFToken': csrftoken },
        },
        columns: [
            { data: 'count' },
            { data: 'regdate' },
            { data: 'fullname' },
            { data: 'username' },
            { data: 'gender' },
            { data: 'dept' },
            { data: 'phone' },
            { data: 'blocked' },
            { data: 'action' }
        ],
        order: [[2, 'asc']],
        paging: true,
        pageLength: 10,
        lengthChange: true,
        autoWidth: true,
        searching: true,
        bInfo: true,
        bSort: true,
        orderCellsTop: true,
        columnDefs: [{
            "targets": [0, 6, 8],
            "orderable": false
        },
        {
            "targets": 7,
            "createdCell": function (cell, cellData, rowData, rowIndex, colIndex) {
                if (cellData === "Blocked") {
                    $(cell).addClass('text-danger');
                } else {
                    $(cell).addClass('text-success');
                }
            }
        },
        {
            "targets": 8,
            "createdCell": function (cell, cellData, rowData, rowIndex, colIndex) {
                var cell_content =`<a href="/manage/user/fr/user/us/${rowData.id}/" class="btn btn-bblue text-white">view</a>`;
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
                title: "Users - Mwezai dispensary",
                exportOptions: {
                    columns: [0, 1, 2, 3, 4, 5, 6]
                }
            },
            { // PDF button
                extend: "pdf",
                text: "<i class='fas fa-file-pdf'></i>",
                className: "btn btn-bblue text-white",
                titleAttr: "Export to PDF",
                title: "Users - Mwezai dispensary",
                exportOptions: {
                    columns: [0, 1, 2, 3, 4, 5, 6]
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
                        doc.content[1].table.body[i][5].alignment = 'left';
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
                title: "Users - Mwezai dispensary",
                exportOptions: {
                    columns: [0, 1, 2, 3, 4, 5, 6]
                }
            },
            { // Print button
                extend: "print",
                text: "<i class='fas fa-print'></i>",
                className: "btn btn-bblue text-white",
                title: "Users - Mwezai dispensary",
                titleAttr: "Print",
                exportOptions: {
                    columns: [0, 1, 2, 3, 4, 5, 6]
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
                } else if (colIdx == 4) {
                    var select = document.createElement("select");
                    select.className = "select-filter text-ttxt1";
                    select.innerHTML = `<option value="">All</option>` +
                    `<option value="M">Male</option>` +
                    `<option value="F">Female</option></select>`;
                    cell.html(select);
                    
                    // Add change event listener to the select
                    $(select).on("change", function() {
                        var selectedValue = $(this).val();
                        api.column(colIdx).search(selectedValue).draw();
                    });
                } else if (colIdx == 5) {
                    var select = document.createElement("select");
                    select.className = "select-filter text-ttxt1";
                    select.innerHTML = `<option value="">All</option>` +
                    `<option value="1">Reception</option>` +
                    `<option value="4">Doctors</option></select>` +
                    `<option value="3">Labolatory</option></select>` +
                    `<option value="6">Procedure</option></select>` +
                    `<option value="5">Ultrasound</option></select>` +
                    `<option value="2">Pharmacy</option></select>`;
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
                    `<option value="1">Blocked</option></select>`;
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

    $("#search_users_inpt").keyup(function() {
        table.search($(this).val()).draw();
    });
});

// Check if entire string is alphabets
function onlyAlphabets(str) {
    const regex = /^[a-zA-Z]+$/;
    return regex.test(str);
}

// capitalize the first letter
function capit_str(str) {
    var txt = str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    return txt;
}

// Get the CSRF token from the cookie
var csrftoken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

// Add new user
$('#newuserForm').submit(function(e) {
    e.preventDefault();
    var username = $.trim($("#us_username").val().toLowerCase());
    var fullname = $.trim($("#us_fullname").val());
    var phone = $("#us_phone").val();
    var describe = $.trim($("#us_describe").val());
    var names = fullname.split(" ");

    if(onlyAlphabets(username)) {
        if((username.length >= 3) && (username.length <= 32)) {
            if(names.length >= 2) {
                var formData = new FormData();
                formData.append("username", capit_str(username));
                formData.append("full_name", fullname);
                formData.append("gender", $("#us_gender").val());
                formData.append("department", $("#us_dept").val());
                if(describe.length > 0) { formData.append("description", describe); }
                if(phone.length > 0) { formData.append("phone", phone); }
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
                        $("#userBtn").html("<i class='fas fa-spinner fa-pulse'></i>");
                        $("#userBtn").attr('type','button');
                    },
                    success: function(response) {
                        $("#userBtn").text("Add");
                        $("#userBtn").attr('type','submit');
                        if(response.success) {
                            $('html, body, #newuserForm .modal-body').animate({ scrollTop: 0 }, 'slow');
                            $("#us_formsms").html("<span class='py-2 alert alert-success'><i class='fas fa-check-circle'></i> "+response.sms+"</span>").slideDown('fast').delay(3000).slideUp('fast');
                            $("#newuserForm")[0].reset();
                        } else {
                            if (response.errors.username) {
                                $("#errUsername").html("<i class='fas exclamation-circle'></i> "+response.errors.username).slideDown('fast').delay(3000).slideUp('fast');
                                $("#us_username").focus();
                            } else if (response.errors.full_name) {
                                $("#errFullname").html("<i class='fas exclamation-circle'></i> "+response.errors.full_name).slideDown('fast').delay(3000).slideUp('fast');
                                $("#us_fullname").focus();
                            } else if (response.errors.phone) {
                                $("#errPhone").html("<i class='fas exclamation-circle'></i> "+response.errors.phone).slideDown('fast').delay(3000).slideUp('fast');
                                $("#us_phone").focus();
                            } else {
                                $('html, body').animate({ scrollTop: 0 }, 'slow');
                                $("#us_formsms").html("<span class='py-2 alert alert-danger'><i class='fas fa-exclamation-circle'></i> Failed to complete registration!</span>").slideDown('fast').delay(3000).slideUp('fast');
                            }
                        }
                    },
                    error: function(xhr, status, error) {
                        console.log(error);
                    }
                });
            } else {
                $("#errFullname").html("<i class='fas exclamation-circle'></i> Enter atleast 2 names separated by single space.").slideDown('fast').delay(3000).slideUp('fast');
                $("#us_fullname").focus();
            }
        } else {
            $("#errUsername").html("<i class='fas exclamation-circle'></i> Only 3 to 15 characters are allowed.").slideDown('fast').delay(3000).slideUp('fast');
            $("#us_username").focus();
        }
    } else {
        $("#errUsername").html("<i class='fas fa-exclamation-circle'></i> Only alphabets are allowed.").slideDown('fast').delay(3000).slideUp('fast');
        $("#us_username").focus();
    }
});

// check the validity of the phone number
function validPhone(input) {
    const pattern = /^(\d{10})?$/;
    if (!pattern.test(input.value)) {
        input.setCustomValidity('Please enter a 10-digit number.');
    } else {
        input.setCustomValidity('');
    }
}

