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


var requests_array = [];
$("#phar_requests_btn").click(function (e) { 
    e.preventDefault();

    var checked_rows = 0;
    var pendingRequestsTable = $("#pending_requests_table tbody");
    
    pendingRequestsTable.find("tr").each(function () {
        var checkbox = $("td input", this);
        if (checkbox.is(':checked')) {
            var check_id = checkbox.attr('id');
            requests_array.push(check_id);
            checked_rows++;
        }
    });

    if (checked_rows > 0) {
        var json_data = JSON.stringify(requests_array);
        $.ajax({
            type: 'POST',
            url: "/pharmacy/requests/process/",
            data: json_data,
            dataType: 'json',
            contentType: 'application/json',
            headers: {
                'X-CSRFToken': csrftoken
            },
            beforeSend: function() {
                $("#requests_formsms").slideUp('fast');
                $("#phar_requests_btn, #pharma_load").toggleClass("d-inline-block d-none");
            },
            success: function(response) {
                $("#phar_requests_btn, #pharma_load").toggleClass("d-inline-block d-none");
                $('html, body').animate({ scrollTop: 0 }, 'slow');
                if (response.success) {
                    $("#processed_requests_table").load(location.href+" #processed_requests_table");

                    var failed_array = [];
                    for (let y = 0; y < response.failed.length; y++) {
                        failed_array.push(response.failed[y].id);
                    }

                    requests_array.splice(0, requests_array.length);
                    var tr_remaining = pendingRequestsTable.find("tr").length;

                    pendingRequestsTable.find("tr").each(function () {
                        var checkbox = $("td input", this);
                        var checked = checkbox.is(':checked');
                        var id = !failed_array.includes(checkbox.attr('id'));

                        if (checked && id) {
                            tr_remaining--;
                            $(this).fadeOut('slow').delay(1000).queue(function() {
                                $(this).remove();
                            });
                        }
                    });
                    
                    if (tr_remaining === 0) {
                        var tdata = `<td class="py-5 text-center" colspan="7">No pending requests!</td>`;
                        pendingRequestsTable.html("<tr>" + tdata + "</tr>");
                        $("#phar_requests_btn").toggleClass("d-inline-block d-none");
                    }
                } else {
                    var alert = `<span class='alert alert-danger d-block w-100 p-2 m-0 mb-2'><i class='fas fa-exclamation-circle'></i> ${response.sms}</span>`;
                    $("#requests_formsms").html(alert).slideDown('fast').delay(4000).slideUp('fast');
                }
            },
            error: function(xhr, status, error) {
                console.log(error);
            }
        });
    }
});


document.addEventListener('click', e => {
    const clickedElement = $(e.target);
    if (clickedElement.is('#req_processed .pagination button')) {
        e.preventDefault();
        var currentScrollTop = $('html, body').scrollTop();
        var url_string = location.href + clickedElement.attr('href');
        $("#processed_requests_table").load(url_string + " #processed_requests_table", function () {
            $('html, body').scrollTop(currentScrollTop);
        });
        $("#req_processed .paging_info").load(url_string + " #req_processed .paging_info", function () {
            $('html, body').scrollTop(currentScrollTop);
        });
    }
});