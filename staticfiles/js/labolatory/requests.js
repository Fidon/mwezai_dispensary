$("#container .requests ul li a").click(function (e) { 
    e.preventDefault();
    var tab_id = $(this).attr('href').replace('#','');
    $("#container .requests .tab_container .tab_div").each(function () {
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

// number to string with commas
function numstr(number) {
    return number.toLocaleString('en-US');
}

// check if qty value is valid
function valqty(input) {
    const pattern = /^\d+$/;
    if (!pattern.test(input.value)) {
        input.setCustomValidity('Only numerical values without decimals are allowed!');
    } else {
        input.setCustomValidity('');
    }
}

$("#req_search").keyup(function (e) {
    var qry = $.trim($(this).val());
    const formData = new FormData();
    formData.append("query", qry);
    formData.append("context", "lab");

    const endpoint = "/department/search/supplies-tools/";

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
            $("#tools_div span").fadeOut('fast').delay(1500).queue(function(next) {
                $(this).remove();
                next();
            });
            $("#tools_div .spinner").fadeIn('fast');
            $("#supply_id").val("");
            $("#sup_qty").text("");
        },
        success: function(response) {
            var html = "";
            if (response.results.length > 0) {
                for (let y = 0; y < response.results.length; y++) {
                    const tool = response.results[y];
                    html += `<span id="id_${ tool.id }" class="cls_${ tool.qty }"><i class="fas fa-check-circle"></i>${ tool.name }: ${numstr(tool.price)}@</span>`;
                }
                html += `<div class="spinner" id="sch_spinner"><i class="fas fa-spinner fa-pulse"></i></div>`;
            } else {
                html = `<div class="py-3 text-center">No results found!</div>`;
                html += `<div class="spinner" id="sch_spinner"><i class="fas fa-spinner fa-pulse"></i></div>`;
            }
            $("#tools_div").html(html);
        },
        error: function(xhr, status, error) {
            console.error(error);
        }
    });
});

function update_form_fields(form) {
    $("#new_request_form .tools_list span i").each(function () {
        if ($(this).is(':visible')) {
            $(this).fadeOut('fast');
        }
    });
    $("i", form).fadeIn('fast');
    var id = $(form).attr('id').replace('id_','');
    var qty = $(form).attr('class').replace('cls_','');
    $("#supply_id").val(id);
    $("#sup_qty").text(" stock: "+qty);
}

document.addEventListener('click', e => {
    const clickedElement = $(e.target);
    if (e.target.matches('#new_request_form .tools_list span')) {
        e.preventDefault();
        update_form_fields(e.target);
    }

    if (clickedElement.is('#container .requests .tab_container .pagination button')) {
        e.preventDefault();
        var currentScrollTop = $('html, body').scrollTop();
        var url_string = location.href + clickedElement.attr('href');
        var url_obj = new URL(url_string);
        var div = url_obj.searchParams.get("d");
        var div_id = (div == "pending") ? "#pending_reqs" : "#processed_reqs";
        
        $(div_id + " table").load(url_string + " " + div_id + " table", function () {
            $('html, body').scrollTop(currentScrollTop);
        });
        $(div_id + " .paging_info").load(url_string + " " + div_id + " .paging_info", function () {
            $('html, body').scrollTop(currentScrollTop);
        });
    }
});

$("#new_request_form").submit(function (e) { 
    e.preventDefault();
    var tool_qty = $("#req_qty").val();
    var tool_stock = $("#sup_qty").text().split(" ");
    if (tool_qty <= parseInt(tool_stock[tool_stock.length-1])) {
        var tool_id = $("#supply_id").val();
        var tool_describe = $.trim($("#req_describe").val());
        var formData = new FormData();
        formData.append("id", tool_id);
        formData.append("qty", tool_qty);
        formData.append("describe", tool_describe);
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
                $("#btn_request_btn").html("<i class='fas fa-spinner fa-pulse'></i>");
                $("#btn_request_btn").attr('type', 'button');
            },
            success: function(response) {
                $("#btn_request_btn").html("Send");
                $("#btn_request_btn").attr('type', 'submit');
                $('html, body, #new_request_form').animate({ scrollTop: 0 }, 'slow');
                if(response.success) {
                    var alert = `<span class="alert alert-success px-2 m-0 d-block w-100"><i class="fas fa-exclamation-circle"></i> ${response.sms}</span>`
                    $("#new_request_form")[0].reset();
                    $("#tools_div").load(location.href+" #tools_div");
                } else {
                    var alert = `<span class="alert alert-danger px-2 m-0 d-block w-100"><i class="fas fa-exclamation-circle"></i> ${response.sms}</span>`;
                }
                $("#new_request_form .formsms").html(alert).fadeIn('fast').delay(4000).fadeOut('slow');
            },
            error: function(xhr, status, error) {
                console.error(error);
            }
        });
    } else {
        var alert = `<span class="alert alert-danger px-2 m-0 d-block w-100"><i class="fas fa-exclamation-circle"></i> Quantity cannot exceed available stock!</span>`;
        $('html, body, #new_request_form').animate({ scrollTop: 0 }, 'slow');
        $("#new_request_form .formsms").html(alert).fadeIn('fast').delay(4000).fadeOut('slow');
    }
});
