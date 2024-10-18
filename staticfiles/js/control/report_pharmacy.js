$(function () {
    $("#reportsBtn").click();

    // format number
    function num_str(number) {
        // return number.toLocaleString('en-US');
        return number.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
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
    $("#pharmacy_report_table thead tr").clone(true).attr('class','filters').appendTo('#pharmacy_report_table thead');
    var table = $("#pharmacy_report_table").DataTable({
        fixedHeader: true,
        processing: true,
        serverSide: true,
        ajax: {
            url: "/manage/reports/pharmacy/",
            type: "POST",
            data: function (d) {
                d.res_mindate = get_dates(0);
                d.res_maxdate = get_dates(1);
            },
            dataType: 'json',
            headers: { 'X-CSRFToken': csrftoken },
        },
        columns: [
            { data: 'count' },
            { data: 'res_date' },
            { data: 'med_name' },
            { data: 'med_form' },
            { data: 'med_qty' },
            { data: 'med_cost' },
            { data: 'patient' },
            { data: 'staff' },
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
            "orderable": false
        },
        {
            targets: [2, 3, 6, 7],
            className: 'align-middle text-nowrap text-start',
        },
        {
            targets: [0, 1],
            className: 'align-middle text-nowrap text-center',
        },
        {
            targets: [4, 5],
            className: 'align-middle text-nowrap text-end pe-3',
        }],
        dom: "lBfrtip",
        buttons: [
            { // Copy button
                extend: "copy",
                text: "<i class='fas fa-clone'></i>",
                className: "btn btn-bblue text-white",
                titleAttr: "Copy",
                title: "Pharmacy report - Mwezai dispensary",
                exportOptions: {
                    columns: [0, 1, 2, 3, 4, 5, 6, 7]
                }
            },
            { // PDF button
                extend: "pdf",
                text: "<i class='fas fa-file-pdf'></i>",
                className: "btn btn-bblue text-white",
                titleAttr: "Export to PDF",
                title: "Pharmacy report - Mwezai dispensary",
                filename: 'pharmacy_report',
                orientation: 'landscape',
                pageSize: 'A4',
                footer: true,
                exportOptions: {
                    columns: [0, 1, 2, 3, 4, 5, 6, 7],
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
                    doc.defaultStyle.fontSize = 8;
                    doc.content[1].table.widths = Array(doc.content[1].table.body[1].length + 1).join('*').split('');

                    var rowCount = doc.content[1].table.body.length;
                    for (i = 1; i < rowCount; i++) {
                        doc.content[1].table.body[i][0].margin = [3, 0, 0, 0];
                        doc.content[1].table.body[i][1].alignment = 'center';
                        doc.content[1].table.body[i][2].alignment = 'left';
                        doc.content[1].table.body[i][3].alignment = 'center';
                        doc.content[1].table.body[i][4].alignment = 'center';
                        doc.content[1].table.body[i][5].alignment = 'right';
                        doc.content[1].table.body[i][5].margin = [0, 0, 3, 0];
                        doc.content[1].table.body[i][6].alignment = 'left';
                        doc.content[1].table.body[i][7].alignment = 'left';
                        doc.content[1].table.body[i][7].margin = [0, 0, 3, 0];
                    }

                    doc['footer'] = (function(page, pages) {
                        var tfoot = $("#pharmacy_report_table tfoot tr:eq(0)");
                        return {
                            columns: [{
                                alignment: 'center',
                                text: ['Page', { text: page.toString() },' of ', { text: pages.toString() }, '\nReport coverage: ', { text: tfoot.find('th:eq(1)').text() }, '\tTotal meds: ', { text: tfoot.find('th:eq(2)').text() }, '\tTotal Patients: ', { text: tfoot.find('th:eq(6)').text() }, '\tTotal revenue: ', { text: tfoot.find('th:eq(5)').text()+" TZS" }, '\nPrinted date: ', { text: format_dates('today', 'datetime') }],
                                fontSize: 6
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
                title: "Pharmacy report - Mwezai dispensary",
                exportOptions: {
                    columns: [0, 1, 2, 3, 4, 5, 6, 7]
                }
            },
            { // Print button
                extend: "print",
                text: "<i class='fas fa-print'></i>",
                className: "btn btn-bblue text-white",
                title: "Pharmacy report - Mwezai dispensary",
                orientation: 'landscape',
                pageSize: 'A4',
                titleAttr: "Print",
                footer: true,
                exportOptions: {
                    columns: [0, 1, 2, 3, 4, 5, 6, 7],
                    search: 'applied',
                    order: 'applied'
                },
                tableHeader: {
                    alignment: "center"
                },
                customize: function (win) {
                    $(win.document.body).css("font-size","11pt");
                    $(win.document.body).find("table").addClass("compact").css("font-size","inherit");

                    $(win.document.body).find("table tfoot tr:eq(0)").css('display','none');
                    
                    var tfoot = $("#pharmacy_report_table tfoot tr:eq(0)");
                    var footerContent = 'Report coverage: ' + tfoot.find('th:eq(1)').text() + ' &nbsp; Total meds: ' + tfoot.find('th:eq(2)').text() + ' &nbsp; Total patients: ' + tfoot.find('th:eq(6)').text() + ' &nbsp; Total revenue: ' + tfoot.find('th:eq(5)').text() + ' TZS<br>Printed on: '+format_dates('today', 'datetime');
                    $(win.document.body).find('table tfoot').append('<tr><td colspan="8" class="text-center py-3">' + footerContent + '</td></tr>');
                }
            }
        ],
        drawCallback: function(response) {
            var grand_totals = response.json.grand_totals;
            var grand_obj = {
                total_costs: grand_totals.total_costs,
                total_meds: grand_totals.total_meds,
                total_qty: grand_totals.total_qty,
                total_patients: grand_totals.total_patients
            }
            updateFooter(grand_obj);
        },
        initComplete: function(settings, json_response) {
            var api = this.api();
            api.columns([0, 1, 2, 3, 4, 5, 6, 7]).eq(0).each(function (colIdx) {
                var cell = $(".filters th").eq($(api.column(colIdx).header()).index());
                var title = $(cell).text();
                if (colIdx == 0) {
                    cell.html("");
                } else if (colIdx == 1) {
                    var calendar =`<button type="button" class="btn btn-sm btn-bblue text-white" data-bs-toggle="modal" data-bs-target="#dateFilterModal"><i class="fas fa-calendar-alt"></i></button>`;
                    cell.html(calendar);
                    $("#date_filter_clear").on("click", function() {
                        $("#min_date").val("");
                        $("#max_date").val("");
                    });
                    $("#date_filter_btn").on("click", function() {
                        table.draw();
                    });
                } else if (colIdx == 3) {
                    var select = document.createElement("select");
                    select.className = "select-filter text-ttxt1";
                    select.innerHTML = `<option value="">All</option>` +
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

    $("#global_search_input").keyup(function() {
        table.search($(this).val()).draw();
    });

    // update footer values
    function updateFooter(totals) {
        var footer = $(table.table().footer());
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
        var tr = footer.find('tr:eq(0)');
        tr.find('th:eq(1)').text(report_dates);
        tr.find('th:eq(2)').text(totals.total_meds);
        tr.find('th:eq(4)').text(totals.total_qty);
        tr.find('th:eq(5)').text(totals.total_costs);
        tr.find('th:eq(6)').text(totals.total_patients);
    }
});
