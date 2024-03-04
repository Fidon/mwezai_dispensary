$(function () {
    // ------------ dataTabales library config -----------------
    $("#icd_codes_table thead tr").clone(true).attr('class','filters').appendTo('#icd_codes_table thead');
    var table = $("#icd_codes_table").DataTable({
        fixedHeader: true,
        processing: true,
        serverSide: true,
        ajax: {
            url: "/manage/icd-codes/",
            type: "POST",
            dataType: 'json',
            headers: { 'X-CSRFToken': csrftoken },
        },
        columns: [
            { data: 'count' },
            { data: 'code' },
            { data: 'describe' },
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
            targets: [0, 3],
            orderable: false
        },
        {
            targets: 2,
            classname: "align-middle text-start"
        },
        {
            targets: 3,
            classname: "align-middle text-center",
            createdCell: function (cell, cellData, rowData, rowIndex, colIndex) {
                var del_btn = `<button class="btn btn-sm btn-danger me-2" id="dl_${rowData.id}"><i class="fas fa-trash"></i></button>`;
                var edit_btn = `<button class="btn btn-sm btn-primary" id="ed_${rowData.id}"><i class="fas fa-pen"></i></button>`;
                $(cell).html(del_btn+edit_btn);
            }
        }],
        dom: "lBfrtip",
        initComplete: function() {
            var api = this.api();
            api.columns([0, 1, 2, 3]).eq(0).each(function (colIdx) {
                var cell = $(".filters th").eq($(api.column(colIdx).header()).index());
                var title = $(cell).text();
                if ((colIdx == 0) || (colIdx == 3)) {
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

    $("#search_icdcodes_inpt").keyup(function() {
        table.search($(this).val()).draw();
    });
});


// Get the CSRF token from the cookie
var csrftoken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

// Add new ICD10-code
$('#new_icdcode_form').submit(function(e) {
    e.preventDefault();
    var code = $.trim($("#code_input").val());
    var describe = $.trim($("#describe_input").val());
    var formData = new FormData();
    formData.append("code", code);
    formData.append("describe", describe);
    formData.append("action", "add_new");
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
            $("#icd_10_btn").html("<i class='fas fa-spinner fa-pulse'></i>");
            $("#icd_10_btn").attr('type','button');
        },
        success: function(response) {
            $("#icd_10_btn").text("Add");
            $("#icd_10_btn").attr('type','submit');
            if(response.success) {
                $("#icd_formsms").html("<span class='py-2 alert alert-success'><i class='fas fa-check-circle'></i> "+response.sms+"</span>").slideDown('fast').delay(3000).slideUp('fast');
                $("#new_icdcode_form")[0].reset();
                // $("#icd_codes_table tbody").load(location.href+" #icd_codes_table tbody");
            } else {
                $("#icd_formsms").html("<span class='py-2 alert alert-danger'><i class='fas fa-exclamation-circle'></i> "+response.sms+"</span>").slideDown('fast').delay(3000).slideUp('fast');
            }
        },
        error: function(xhr, status, error) {
            console.log(error);
        }
    });
});


// update ICD10 code
$('#change_icdcode_form').submit(function(e) {
    e.preventDefault();
    var code = $.trim($("#code_up_input").val());
    var describe = $.trim($("#describe_up_input").val());
    var code_id = $("#icd_code_id").val();
    var formData = new FormData();
    formData.append("code", code);
    formData.append("describe", describe);
    formData.append("id", code_id);
    formData.append("action", "update");
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
            $("#change_icd10_btn").html("<i class='fas fa-spinner fa-pulse'></i>");
            $("#change_icd10_btn").attr('type','button');
        },
        success: function(response) {
            $("#change_icd10_btn").text("Update");
            $("#change_icd10_btn").attr('type','submit');
            if(response.success) {
                $("#icd_change_formsms").html("<span class='py-2 alert alert-success'><i class='fas fa-check-circle'></i> "+response.sms+"</span>").slideDown('fast').delay(3000).slideUp('fast');
                var row = $("#ed_"+code_id).parent().parent();
                $("td:nth-child(2)", row).text(code);
                $("td:nth-child(3)", row).text(describe);
            } else {
                $("#icd_change_formsms").html("<span class='py-2 alert alert-danger'><i class='fas fa-exclamation-circle'></i> "+response.sms+"</span>").slideDown('fast').delay(3000).slideUp('fast');
            }
        },
        error: function(xhr, status, error) {
            console.log(error);
        }
    });
});


// delete icd code
$('#del_icdcode_form').submit(function(e) {
    e.preventDefault();
    var code_id = $("#icd_code_del_id").val();
    var formData = new FormData();
    formData.append("id", code_id);
    formData.append("action", "delete");
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
            $("#del_icd10_btn").html("<i class='fas fa-spinner fa-pulse'></i>");
            $("#del_icd10_btn").attr('type','button');
        },
        success: function(response) {
            $("#del_icd10_btn").text("Delete");
            $("#del_icd10_btn").attr('type','submit');
            if(response.success) {
                $("#icd_del_formsms").html("<span class='py-2 alert alert-success'><i class='fas fa-check-circle'></i> "+response.sms+"</span>").slideDown('fast').delay(3000).slideUp('fast');
                $("#del_icdcode_form")[0].reset();
                $("#ed_"+code_id).parent().parent().hide('fast');
                setTimeout(function(){
                    $("#del_icd_code").modal('hide');
                }, 3000);
            } else {
                $("#icd_del_formsms").html("<span class='py-2 alert alert-danger'><i class='fas fa-exclamation-circle'></i> "+response.sms+"</span>").slideDown('fast').delay(3000).slideUp('fast');
            }
        },
        error: function(xhr, status, error) {
            console.log(error);
        }
    });
});


document.addEventListener('click', e => {
    var clickedBtn = $(e.target);
    var check = (clickedBtn.is('#icd_codes_table td button')) || (clickedBtn.is('#icd_codes_table td button i'));
    
    if (check) {
        var buttonId, parentRow, icdId, icdCode, icdDescribe;

        if (clickedBtn.is('#icd_codes_table td button')) {
            buttonId = clickedBtn.attr('id');
            parentRow = clickedBtn.parent().parent();
        } else if (clickedBtn.is('#icd_codes_table td button i')) {
            buttonId = clickedBtn.parent().attr('id');
            parentRow = clickedBtn.parent().parent().parent();
        }

        if (buttonId) {
            var splitId = buttonId.split("_");
            icdId = splitId[1];
            icdCode = $("td:nth-child(2)", parentRow).text();

            if (splitId[0] === "ed") {
                icdDescribe = $("td:nth-child(3)", parentRow).text();
                $("#code_up_input").val(icdCode);
                $("#describe_up_input").val(icdDescribe);
                $("#icd_code_id").val(icdId);
                $("#change_icd_code").modal('show');
            } else {
                var info = `<h5>Confirm deleting code <b>${icdCode}</b>..?</h5>`;
                $("#del_explanation").html(info);
                $("#icd_code_del_id").val(icdId);
                $("#del_icd_code").modal('show');
            }
        }
    }
});

