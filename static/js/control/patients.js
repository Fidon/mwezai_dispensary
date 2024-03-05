$(function () {
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

        var amountTotal = api.column(4).data().reduce( function (a, b) {
            return intVal(a) + intVal(b);
        }, 0 );

        return {
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

    // patients admitted per receptionist
    $("#patients_logs_table thead tr").clone(true).attr('class','filters').appendTo('#patients_logs_table thead');
    var patients_table = $("#patients_logs_table").DataTable({
        fixedHeader: true,
        processing: true,
        serverSide: true,
        ajax: {
            url: "/manage/patients/logs/",
            type: "POST",
            data: function (d) {
                d.start_date = get_dates(0);
                d.end_date = get_dates(1);
            },
            dataType: 'json',
            headers: { 'X-CSRFToken': csrftoken },
        },
        columns: [
            { data: 'count' },
            { data: 'regdate' },
            { data: 'names' },
            { data: 'gender' },
            { data: 'amount' },
            { data: 'action' },
        ],
        order: [[1, 'desc']],
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
            targets: 2,
            className: 'align-middle text-nowrap text-start',
        },
        {
            targets: [0, 1, 3],
            className: 'align-middle text-nowrap text-center',
        },
        {
            targets: 4,
            className: 'align-middle text-nowrap text-end pe-2',
        },
        {
            targets: 5,
            className: 'align-middle text-nowrap text-center',
            createdCell: function (cell, cellData, rowData, rowIndex, colIndex) {
                var cell_content =`<button class="btn btn-bblue text-white" id="pt_${rowData.id}">view</button>`;
                $(cell).html(cell_content);
            }
        }],
        dom: "lBfrtip",
        buttons: [],
        footerCallback: function (row, data, start, end, display) {
            var api = this.api();
            var totals = calculate_page_totals(api);
            updateFooter("sub", totals);
        },
        drawCallback: function(response) {
            var grand_totals = response.json.grand_totals;
            var grand_obj = {
                grand_amount: grand_totals.grand_amount
            }
            updateFooter("grand", grand_obj);
        },
        initComplete: function(settings, json_response) {
            var api = this.api();
            api.columns([0, 1, 2, 3, 4, 5]).eq(0).each(function (colIdx) {
                var cell = $(".filters th").eq($(api.column(colIdx).header()).index());
                var title = $(cell).text();
                if (colIdx == 5) {
                    cell.html("");
                } else if (colIdx == 0) {
                    var calendar =`<button type="button" class="btn btn-sm btn-bblue text-white" data-bs-toggle="modal" data-bs-target="#dateFilterModal"><i class="fas fa-calendar-alt"></i></button>`;
                    cell.html(calendar);
                    $("#date_filter_clear").on("click", function() {
                        $("#min_date").val("");
                        $("#max_date").val("");
                    });
                    $("#date_filter_btn").on("click", function() {
                        patients_table.draw();
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

            var grand_totals = json_response.grand_totals;
            var grand_obj = {
                grand_amount: grand_totals.grand_amount
            }
            updateFooter("grand", grand_obj);
        }
    });

    // update footer values
    function updateFooter(total_type, totals) {
        var footer = $(patients_table.table().footer());
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
            tr.find('th:eq(4)').text(num_comm(totals.grand_amount)+' TZS');
        } else {
            var tr = footer.find('tr:eq(0)');
            tr.find('th:eq(4)').html(num_comm(totals.amountTotal)+' TZS');
        }
    }

    $("#patients_search_input").keyup(function() {
        patients_table.search($(this).val()).draw();
    });


    document.addEventListener('click', e => {
        const clickedElement = $(e.target);
        if (clickedElement.is('table tbody tr td button')) {
            e.preventDefault();
            var id = clickedElement.attr('id').split("_");
            var id_patient = id[1];
            var names = clickedElement.closest('tr').find('td:eq(2)').text();
            var gender = clickedElement.closest('tr').find('td:eq(3)').text();
            $("#patient_services_modal .modal-header h5").text("Patient: "+names+" ("+gender+")");
            $("#patient_services_modal").modal('show');
            

            var formData = new FormData();
            formData.append("startdate", get_dates(0));
            formData.append("enddate", get_dates(1));
            $.ajax({
                type: 'POST',
                url: "/manage/patients/logs/p/"+id_patient+"/",
                data: formData,
                dataType: 'json',
                contentType: false,
                processData: false,
                headers: {
                    'X-CSRFToken': csrftoken
                },
                beforeSend: function() {
                    html = `<tr><td colspan='6' class='text-center py-3 fs-5'>Loading..</td></tr>`;
                    $("#patient_service_details_table tbody").html(html);
                },
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
                            html += `<td class="text-end">${service.costs}</td>`;
                            html += `<td class="text-start">${service.staff}</td>`;
                            html += `<td class="text-start">${service.status}</td>`;
                            html += `</tr>`;
                        }
                        html += `<tr><th colspan='3'>Total amount paid:</th>`;
                        html += `<th colspan='2'>${response.totalcost} TZS</th>`;
                        html += `<th></th></tr>`;
                        $("#patient_service_details_table tbody").html(html);
                    }
                },
                error: function(xhr, status, error) {
                    console.log(error);
                }
            });
        }
    });
    
});
