$(function () {
    $("#reportsBtn").click();

    // format number
    function num_str(number) {
        return number.toLocaleString('en-US');
    }

    function num_comm(number) {
        return Number(number).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function format_dates(date_str, str) {
        if (date_str == "today") {
            var today = new Date();
        } else {
            var today = new Date(date_str);
        }
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
        const day = (today.getDate() < 10) ? '0'+today.getDate() : today.getDate();
        const hours = (today.getHours() < 10) ? '0'+today.getHours() : today.getHours();
        const minutes = (today.getMinutes() < 10) ? '0'+today.getMinutes() : today.getMinutes();
        if (str == "datetime") {
            return `${day}-${months[today.getMonth()]}-${today.getFullYear()} ${hours}:${minutes}`;
        } else {
            return `${day}-${months[today.getMonth()]}-${today.getFullYear()}`;
        }
    }

    // Get the CSRF token from the cookie
    var csrftoken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

    // calculate page subtotals
    function calculate_page_totals(api) {
        var intVal = function (i) {
            return typeof i === 'string' ?
            i.replace(/[\$,]/g, '')*1 :
            typeof i === 'number' ?
            i : 0;
        };

        var newPatientsTotal = api.column(2).data().reduce(function (a, b) {
            return intVal(a) + intVal(b);
        }, 0 );
            
        var admittedTotal = api.column(3).data().reduce( function (a, b) {
            return intVal(a) + intVal(b);
        }, 0 );
            
        var amountTotal = api.column(4).data().reduce( function (a, b) {
            return intVal(a) + intVal(b);
        }, 0 );

        return {
            newPatientsTotal: newPatientsTotal,
            admittedTotal: admittedTotal,
            amountTotal: amountTotal
        };
    }

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
    $("#reception_table thead tr").clone(true).attr('class','filters').appendTo('#reception_table thead');
    var table = $("#reception_table").DataTable({
        fixedHeader: true,
        processing: true,
        serverSide: true,
        ajax: {
            url: "/manage/reports/reception/",
            type: "POST",
            data: function (d) {
                d.rec_mindate = get_dates(0);
                d.rec_maxdate = get_dates(1);
            },
            dataType: 'json',
            headers: { 'X-CSRFToken': csrftoken },
        },
        columns: [
            { data: 'count' },
            { data: 'names' },
            { data: 'patients' },
            { data: 'admitted' },
            { data: 'amount' },
        ],
        order: [[1, 'asc']],
        paging: true,
        pageLength: 10,
        lengthChange: true,
        autoWidth: true,
        searching: true,
        bInfo: true,
        bSort: true,
        orderCellsTop: true,
        columnDefs: [{
            "targets": 0,
            "orderable": false,
            className: 'align-middle text-nowrap text-center',
        },
        {
            targets: 1,
            className: 'align-middle text-nowrap text-start',
        },
        {
            targets: 2,
            className: 'align-middle text-nowrap text-center',
            createdCell: function (cell, cellData, rowData, rowIndex, colIndex) {
                var cell_content =`<a href="/manage/reports/reception/u/${rowData.id}/c/patients/" class="link d-inline-block w-auto py-1 px-5">${cellData}</a>`;
                $(cell).html(cell_content);
            }
        },
        {
            targets: 3,
            className: 'align-middle text-nowrap text-center',
            createdCell: function (cell, cellData, rowData, rowIndex, colIndex) {
                var cell_content =`<a href="/manage/reports/reception/u/${rowData.id}/c/admission/" class="link d-inline-block w-auto py-1 px-5">${cellData}</a>`;
                $(cell).html(cell_content);
            }
        },
        {
            targets: 4,
            className: 'align-middle text-nowrap text-end pe-3',
            createdCell: function (cell, cellData, rowData, rowIndex, colIndex) {
                var cell_content =`<a href="/manage/reports/reception/u/${rowData.id}/c/revenue/" class="link d-inline-block w-auto py-1 px-3">${cellData}</a>`;
                $(cell).html(cell_content);
            }
        }],
        dom: "lBfrtip",
        buttons: [
            { // Copy button
                extend: "copy",
                text: "<i class='fas fa-clone'></i>",
                className: "btn btn-bblue text-white",
                titleAttr: "Copy",
                title: "Reception report - Mwezai dispensary",
                exportOptions: {
                    columns: [0, 1, 2, 3, 4]
                }
            },
            { // PDF button
                extend: "pdf",
                text: "<i class='fas fa-file-pdf'></i>",
                className: "btn btn-bblue text-white",
                titleAttr: "Export to PDF",
                title: "Reception report - Mwezai dispensary",
                filename: 'Reception_report',
                orientation: 'portrait',
                pageSize: 'A4',
                footer: true,
                exportOptions: {
                    columns: [0, 1, 2, 3, 4],
                    search: 'applied',
                    order: 'applied'
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
                        doc.content[1].table.body[i][0].margin = [3, 0, 0, 0];
                        doc.content[1].table.body[i][1].alignment = 'left';
                        doc.content[1].table.body[i][4].alignment = 'right';
                        doc.content[1].table.body[i][4].margin = [0, 0, 3, 0];
                    }

                    doc['footer'] = (function(page, pages) {
                        var tfoot = $("#reception_table tfoot tr:eq(1)");
                        return {
                            columns: [{
                                alignment: 'center',
                                text: ['Page', { text: page.toString() },' of ', { text: pages.toString() }, '\nReport coverage: ', { text: tfoot.find('th:eq(1)').text() }, '\tTotal patients: ', { text: tfoot.find('th:eq(2)').text() }, '\tTotal admitted: ', { text: tfoot.find('th:eq(3)').text() }, '\tTotal revenue: ', { text: tfoot.find('th:eq(4)').text()+" TZS" }, '\nPrinted date: ', { text: format_dates('today', 'datetime') }],
                                fontSize: 8
                            }],
                            margin: [110, 0]
                        };
                    });
                }
            },
            { // Export to excel button
                extend: "excel",
                text: "<i class='fas fa-file-excel'></i>",
                className: "btn btn-bblue text-white",
                titleAttr: "Export to Excel",
                title: "Reception report - Mwezai dispensary",
                exportOptions: {
                    columns: [0, 1, 2, 3, 4]
                }
            },
            { // Print button
                extend: "print",
                text: "<i class='fas fa-print'></i>",
                className: "btn btn-bblue text-white",
                title: "Reception report - Mwezai dispensary",
                orientation: 'landscape',
                pageSize: 'A4',
                titleAttr: "Print",
                footer: true,
                exportOptions: {
                    columns: [0, 1, 2, 3, 4],
                    search: 'applied',
                    order: 'applied'
                },
                tableHeader: {
                    alignment: "center"
                },
                customize: function (win) {
                    $(win.document.body).css("font-size","11pt");
                    $(win.document.body).find("table").addClass("compact").css("font-size","inherit");

                    var tfoot = $("#reception_table tfoot tr:eq(1)");

                    var footerContent = 'Report coverage: ' + tfoot.find('th:eq(1)').text() + ' &nbsp; Total patients: ' + tfoot.find('th:eq(2)').text() + ' &nbsp; Total admitted: ' + tfoot.find('th:eq(3)').text() + ' &nbsp; Total revenue: ' + tfoot.find('th:eq(4)').text() + ' TZS<br>Printed on: '+format_dates('today', 'datetime');
                    $(win.document.body).find('table tfoot').append('<tr><td colspan="5" class="text-center py-3">' + footerContent + '</td></tr>');
                }
            }
        ],
        footerCallback: function (row, data, start, end, display) {
            var api = this.api();
            var totals = calculate_page_totals(api);
            updateFooter("sub", totals);
        },
        drawCallback: function(response) {
            var grand_totals = response.json.grand_totals;
            var grand_obj = {
                grand_patients: grand_totals.grand_patients,
                grand_admitted: grand_totals.grand_admitted,
                grand_amount: grand_totals.grand_amount
            }
            updateFooter("grand", grand_obj);
        },
        initComplete: function(settings, json_response) {
            var api = this.api();
            api.columns([0, 1, 2, 3, 4]).eq(0).each(function (colIdx) {
                var cell = $(".filters th").eq($(api.column(colIdx).header()).index());
                var title = $(cell).text();
                if (colIdx == 0) {
                    var calendar =`<button type="button" class="btn btn-sm btn-bblue text-white" data-bs-toggle="modal" data-bs-target="#dateFilterModal"><i class="fas fa-calendar-alt"></i></button>`;
                    cell.html(calendar);
                    $("#date_filter_clear").on("click", function() {
                        $("#min_date").val("");
                        $("#max_date").val("");
                    });
                    $("#date_filter_btn").on("click", function() {
                        table.draw();
                    });
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

            // Footer settings & customization
            var grand_totals = json_response.grand_totals;
            var grand_obj = {
                grand_patients: grand_totals.grand_patients,
                grand_admitted: grand_totals.grand_admitted,
                grand_amount: grand_totals.grand_amount
            }
            updateFooter("grand", grand_obj);
        }
    });

    $("#global_search_input").keyup(function() {
        table.search($(this).val()).draw();
    });

    // update footer values
    function updateFooter(total_type, totals) {
        var footer = $(table.table().footer());
        if (total_type == "grand") {
            var report_dates = "All time";
            var date_start = $("#min_date").val();
            var date_end = $("#max_date").val();
            if (date_start && date_end) {
                report_dates = `${format_dates(date_start, 'date')} - ${format_dates(date_end, 'date')}`;
            } else if (date_start) {
                report_dates = `From ${format_dates(date_start, 'date')}`
            } else if (date_end) {
                report_dates = `Up to ${format_dates(date_end, 'date')}`;
            }
            var tr = footer.find('tr:eq(1)');
            tr.find('th:eq(1)').text(report_dates);
            tr.find('th:eq(2)').text(num_str(totals.grand_patients));
            tr.find('th:eq(3)').text(num_str(totals.grand_admitted));
            tr.find('th:eq(4)').text(num_comm(totals.grand_amount));
        } else {
            var tr = footer.find('tr:eq(0)');
            tr.find('th:eq(2)').html(num_str(totals.newPatientsTotal));
            tr.find('th:eq(3)').html(num_str(totals.admittedTotal));
            tr.find('th:eq(4)').html(num_comm(totals.amountTotal));
        }
    }






    // new patients registered per receptionist
    $("#new_patients_table thead tr").clone(true).attr('class','filters').appendTo('#new_patients_table thead');
    var new_patients_table = $("#new_patients_table").DataTable({
        fixedHeader: true,
        processing: true,
        serverSide: true,
        ajax: {
            url: "/manage/reports/reception/u/"+$('#receptionist_id').val()+"/c/patients/",
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
            { data: 'regDate' },
            { data: 'fullname' },
            { data: 'fileNumber' },
            { data: 'gender' },
            { data: 'contact' },
        ],
        order: [[1, 'asc']],
        paging: true,
        pageLength: 10,
        lengthChange: true,
        autoWidth: true,
        searching: true,
        bInfo: true,
        bSort: true,
        orderCellsTop: true,
        columnDefs: [{
            "targets": [0, 5],
            "orderable": false
        },
        {
            targets: 2,
            className: 'align-middle text-nowrap text-start',
        },
        {
            targets: [0, 1, 3, 4, 5],
            className: 'align-middle text-nowrap text-center',
        }],
        dom: "lBfrtip",
        buttons: [],
        initComplete: function() {
            var api = this.api();
            api.columns([0, 1, 2, 3, 4, 5]).eq(0).each(function (colIdx) {
                var cell = $(".filters th").eq($(api.column(colIdx).header()).index());
                var title = $(cell).text();
                if (colIdx == 0) {
                    cell.html("");
                } else if (colIdx == 1) {
                    var calendar =`<button type="button" class="btn btn-sm btn-bblue text-white" data-bs-toggle="modal" data-bs-target="#date_filter_modal"><i class="fas fa-calendar-alt"></i></button>`;
                    cell.html(calendar);
                    $("#date_clear").on("click", function() {
                        $("#min_date").val("");
                        $("#max_date").val("");
                    });
                    $("#date_filter_btn").on("click", function() {
                        new_patients_table.draw();
                    });
                } else if (colIdx == 4) {
                    var select = document.createElement("select");
                    select.className = "select-filter text-ttxt1";
                    select.innerHTML = `<option value="">All</option>` +
                    `<option value="Male">Male</option>` +
                    `<option value="Female">Female</option></select>`;
                    cell.html(select);
                    
                    // Add change event listener to the select
                    $(select).on("change", function() {
                        var selectedValue = $(this).val();
                        api.column(colIdx).search(selectedValue).draw();
                    });
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

    // patients admitted per receptionist
    $("#admitted_patients_table thead tr").clone(true).attr('class','filters').appendTo('#admitted_patients_table thead');
    var admitted_patients_table = $("#admitted_patients_table").DataTable({
        fixedHeader: true,
        processing: true,
        serverSide: true,
        ajax: {
            url: "/manage/reports/reception/u/"+$('#receptionist_id').val()+"/c/admission/",
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
            { data: 'fullname' },
            { data: 'fileNumber' },
            { data: 'gender' },
            { data: 'action' },
        ],
        order: [[1, 'asc']],
        paging: true,
        pageLength: 10,
        lengthChange: true,
        autoWidth: true,
        searching: true,
        bInfo: true,
        bSort: true,
        orderCellsTop: true,
        columnDefs: [{
            "targets": [0, 4],
            "orderable": false
        },
        {
            targets: 1,
            className: 'align-middle text-nowrap text-start',
        },
        {
            targets: [0, 2, 3],
            className: 'align-middle text-nowrap text-center',
        },
        {
            targets: 4,
            className: 'align-middle text-nowrap text-center',
            createdCell: function (cell, cellData, rowData, rowIndex, colIndex) {
                var cell_content =`<button class="btn btn-bblue text-white" id="pt_${rowData.id}">view</button>`;
                $(cell).html(cell_content);
            }
        }],
        dom: "lBfrtip",
        buttons: [],
        initComplete: function() {
            var api = this.api();
            api.columns([0, 1, 2, 3, 4]).eq(0).each(function (colIdx) {
                var cell = $(".filters th").eq($(api.column(colIdx).header()).index());
                var title = $(cell).text();
                if (colIdx == 4) {
                    cell.html("");
                } else if (colIdx == 0) {
                    var calendar =`<button type="button" class="btn btn-sm btn-bblue text-white" data-bs-toggle="modal" data-bs-target="#date_filter_modal"><i class="fas fa-calendar-alt"></i></button>`;
                    cell.html(calendar);
                    $("#date_clear").on("click", function() {
                        $("#min_date").val("");
                        $("#max_date").val("");
                    });
                    $("#date_filter_btn").on("click", function() {
                        admitted_patients_table.draw();
                    });
                } else if (colIdx == 3) {
                    var select = document.createElement("select");
                    select.className = "select-filter text-ttxt1";
                    select.innerHTML = `<option value="">All</option>` +
                    `<option value="Male">Male</option>` +
                    `<option value="Female">Female</option></select>`;
                    cell.html(select);
                    
                    // Add change event listener to the select
                    $(select).on("change", function() {
                        var selectedValue = $(this).val();
                        api.column(colIdx).search(selectedValue).draw();
                    });
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

    // revenue generated per receptionist
    $("#revenue_table thead tr").clone(true).attr('class','filters').appendTo('#revenue_table thead');
    var revenue_table = $("#revenue_table").DataTable({
        fixedHeader: true,
        processing: true,
        serverSide: true,
        ajax: {
            url: "/manage/reports/reception/u/"+$('#receptionist_id').val()+"/c/revenue/",
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
            { data: 'fullname' },
            { data: 'fileNumber' },
            { data: 'revenue' },
            { data: 'action' },
        ],
        order: [[1, 'asc']],
        paging: true,
        pageLength: 10,
        lengthChange: true,
        autoWidth: true,
        searching: true,
        bInfo: true,
        bSort: true,
        orderCellsTop: true,
        columnDefs: [{
            "targets": [0, 4],
            "orderable": false
        },
        {
            targets: 1,
            className: 'align-middle text-nowrap text-start',
        },
        {
            targets: [0, 2],
            className: 'align-middle text-nowrap text-center',
        },
        {
            targets: 3,
            className: 'align-middle text-nowrap text-end pe-1',
        },
        {
            targets: 4,
            className: 'align-middle text-nowrap text-center',
            createdCell: function (cell, cellData, rowData, rowIndex, colIndex) {
                var cell_content =`<button class="btn btn-bblue text-white" id="ad_${rowData.id}">view</button>`;
                $(cell).html(cell_content);
            }
        }],
        dom: "lBfrtip",
        buttons: [],
        initComplete: function() {
            var api = this.api();
            api.columns([0, 1, 2, 3, 4]).eq(0).each(function (colIdx) {
                var cell = $(".filters th").eq($(api.column(colIdx).header()).index());
                var title = $(cell).text();
                if (colIdx == 4) {
                    cell.html("");
                } else if (colIdx == 0) {
                    var calendar =`<button type="button" class="btn btn-sm btn-bblue text-white" data-bs-toggle="modal" data-bs-target="#date_filter_modal"><i class="fas fa-calendar-alt"></i></button>`;
                    cell.html(calendar);
                    $("#date_clear").on("click", function() {
                        $("#min_date").val("");
                        $("#max_date").val("");
                    });
                    $("#date_filter_btn").on("click", function() {
                        revenue_table.draw();
                    });
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





    function extract_reg(url) {
        if (url.endsWith('/')) {
            url = url.slice(0, -1);
        }
        var parts = url.split('/');
        var index_u = parts.indexOf('u');
        if (index_u !== -1 && index_u < parts.length - 1) {
            return parts[index_u + 1];
        } else {
            return null;
        }
    }


    document.addEventListener('click', e => {
        const clickedElement = $(e.target);
        if (clickedElement.is('table tbody tr td button')) {
            e.preventDefault();
            var id = clickedElement.attr('id').split("_");
            var id_patient = id[1];
            var url = window.location.href;
            if(url.includes('admission')) {
                var id_category = "admission";
            } else if(url.includes('revenue')) {
                var id_category = "revenue";
            }
            var names = clickedElement.closest('tr').find('td:eq(1)').text();
            $("#reception_details_modal .modal-header h5").text("Patient services: "+names);
            $("#reception_details_modal").modal('show');
            

            var formData = new FormData();
            formData.append("mindate", get_dates(0));
            formData.append("maxdate", get_dates(1));
            var reg = extract_reg(url);
            $.ajax({
                type: 'POST',
                url: "/manage/reports/reception/pat/"+id_patient+"/act/"+id_category+"/reg/"+reg+"/",
                data: formData,
                dataType: 'json',
                contentType: false,
                processData: false,
                headers: {
                    'X-CSRFToken': csrftoken
                },
                beforeSend: function() {},
                success: function(response) {
                    if(response.success) {
                        var html = ``;
                        var services_list = response.services;
                        for(let i = 0; i < services_list.length; i++) {
                            var service = services_list[i];
                            html += `<tr>`;
                            html += `<td>${i+1}</td>`;
                            html += `<td>${service.dates}</td>`;
                            html += `<td class="text-start">${service.names}</td>`;
                            html += `<td>${service.costs}</td>`;
                            /*if (service.results == 'revenue') {
                                html += `<td class="text-start" style="cursor:pointer" id="${service.id}">${service.status}</td>`;
                            } else {*/
                                html += `<td class="text-start">${service.status}</td>`;
                            // }
                            html += `</tr>`;
                        }
                        $("#rec_details_table tbody").html(html);
                    }
                },
                error: function(xhr, status, error) {
                    console.log(error);
                }
            });
        } /*else if (clickedElement.is('#rec_details_table tbody tr td')) {
            if (clickedElement.attr('id')) {
                var results_number = clickedElement.attr('id');
            }
        }*/
    });
    
});
