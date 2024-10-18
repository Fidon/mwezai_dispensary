$("#servicesBtn").click();


$("#container .item_info ul li a").click(function (e) { 
    e.preventDefault();
    var tab_id = $(this).attr('href').replace('#','');
    $("#container .item_info .tab_container .tab_div").each(function () {
        if ($(this).is(':visible')) {
            if($(this).attr('id') !== tab_id) {
                $(this).css('display','none');
                $('#'+tab_id).fadeIn('slow');
            }
        }
    });
});


$(function () {
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
    $("#procedures_table thead tr").clone(true).attr('class','filters').appendTo('#procedures_table thead');
    var table = $("#procedures_table").DataTable({
        fixedHeader: true,
        processing: true,
        serverSide: true,
        ajax: {
            url: "/manage/retrieve_data/param/procedures_6/",
            type: "POST",
            data: function (d) {
                d.reg_mindate = get_dates(0, "min_date");
                d.reg_maxdate = get_dates(1, "max_date");
            },
            dataType: 'json',
            headers: { 'X-CSRFToken': csrftoken },
        },
        columns: [
            { data: 'count' },
            { data: 'regdate' },
            { data: 'names' },
            { data: 'status' },
            { data: 'price' },
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
            targets: [0, 5],
            orderable: false
        },
        {
            targets: 3,
            createdCell: function (cell, cellData, rowData, rowIndex, colIndex) {
                if (cellData === "Hidden") {
                    $(cell).addClass('text-danger');
                } else {
                    $(cell).addClass('text-success');
                }
            }
        },
        {
            targets: 5,
            createdCell: function (cell, cellData, rowData, rowIndex, colIndex) {
                var cell_content =`<a href="/manage/services/i/${rowData.id}/d/6/" class="btn btn-bblue text-white">view</a>`;
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
                title: "Procedures - Mwezai dispensary",
                exportOptions: {
                    columns: [0, 1, 2, 3]
                }
            },
            { // PDF button
                extend: "pdf",
                text: "<i class='fas fa-file-pdf'></i>",
                className: "btn btn-bblue text-white",
                titleAttr: "Export to PDF",
                title: "Procedures - Mwezai dispensary",
                exportOptions: {
                    columns: [0, 1, 2, 3]
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
                title: "Procedures - Mwezai dispensary",
                exportOptions: {
                    columns: [0, 1, 2, 3]
                }
            },
            { // Print button
                extend: "print",
                text: "<i class='fas fa-print'></i>",
                className: "btn btn-bblue text-white",
                title: "Procedures - Mwezai dispensary",
                titleAttr: "Print",
                exportOptions: {
                    columns: [0, 1, 2, 3]
                },
                customize: function (win) {
                    $(win.document.body).css("font-size","11pt");
                    $(win.document.body).find("table").addClass("compact").css("font-size","inherit");
                }
            }
        ],
        initComplete: function() {
            var api = this.api();
            api.columns([0, 1, 2, 3, 4, 5]).eq(0).each(function (colIdx) {
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
                } else if (colIdx == 3) {
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
                } else if ((colIdx == 0) || (colIdx == 5)) {
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

    $("#search_procedure_inpt").keyup(function() {
        table.search($(this).val()).draw();
    });
});

