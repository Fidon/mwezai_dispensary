$("#container .patients ul li a").click(function (e) { 
    e.preventDefault();
    var tab_id = $(this).attr('href').replace('#','');
    $("#container .patients .tab_container .tab_div").each(function () {
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



function move_to_paypage(fnum) {
    window.location.href = "/reception/pay/p/"+fnum+"/";
}


$("#container .patients .tab_container .tab_div .input-group button").click(function (e) {
    var input = $("input", $(this).parent());
    var search_id = input.attr('id');
    var search_str = $.trim(input.val());
    var url_string = location.href;
    if (url_string.indexOf("?") !== -1) {
        url_string = url_string+"&qry="+search_str;
    } else {
        url_string = url_string+"?qry="+search_str;
    }

    var div_id = "";
    if (search_id.indexOf("pending") !== -1) {
        div_id = "#pat_pending";
    } else if (search_id.indexOf("patients") !== -1) {
        div_id = "#pat_allpatients";
    } else {
        div_id = "#pat_waiting";
    }
    
    url_string = url_string + "&div=" + div_id.replace('#','');
    $(div_id + " table").load(url_string + " " + div_id + " table");
    $(div_id + " .paging_info").load(url_string + " " + div_id + " .paging_info");
});


document.addEventListener('click', e => {
    const clickedElement = $(e.target);
    if (clickedElement.is('#container .patients .tab_container .pagination button')) {
        e.preventDefault();
        var currentScrollTop = $('html, body').scrollTop();
        var url_string = location.href + clickedElement.attr('href');
        var search_val = "";
        var url_obj = new URL(url_string);
        var div = url_obj.searchParams.get("d");
        var div_id = "";
        if (div == "pending") {
            div_id = "#pat_pending";
            search_val = $.trim($("#search_pending").val());
        } else if (div == "patients") {
            div_id = "#pat_allpatients";
            search_val = $.trim($("#search_allpatients").val());
        } else {
            div_id = "#pat_waiting";
            search_val = $.trim($("#search_waiting").val());
        }
        
        if(search_val.length > 0) url_string = url_string + "&qry=" + search_val + "&div=" + div_id;
        $(div_id + " table").load(url_string + " " + div_id + " table", function () {
            $('html, body').scrollTop(currentScrollTop);
        });
        $(div_id + " .paging_info").load(url_string + " " + div_id + " .paging_info", function () {
            $('html, body').scrollTop(currentScrollTop);
        });
    }
});


