$(document).ready(function () {
    // Ininitialize all popovers in the page/doc
    var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'))
    var popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl)
    })

    // Initialize Bootstrap tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl)
    })
});


// Dropdown menu (navbar) function
function drop_menu(el, ev) {
    ev.preventDefault();
    var parent = $(el).parent();
    if($("i:nth-child(2)", el).css("display") == "none"){
        $("i:nth-child(3)", el).css("display","none");
        $("i:nth-child(2)", el).fadeIn('fast');
    } else {
        $("i:nth-child(2)", el).css("display","none");
        $("i:nth-child(3)", el).fadeIn('fast');
    }
    $(".dp_menu", parent).slideToggle('fast');
}


// display offcanvas navbar menu
$("#main header .divuser span.menu").click(function (e) {
    e.preventDefault();
    var canva_html = $('#menuCanvas .offcanvas-body');
    if(canva_html.html().length == 0) {
        canva_html.html($("#navbar").html());
    }
    var link = "";
    $("div.link","#navbar").each(function () {
        if ($("a",this).css("color") == "rgb(21, 67, 96)") {
            link = $("a",this).attr('class')
        }
    });
    $("#menuCanvas .menu_div div.link a."+link).css({'background-color': '#F0F0F0','color': '#154360'});
    $('#menuCanvas').offcanvas('show');
});


// Get the CSRF token
var csrftoken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');


var formData = new FormData();
formData.append("depart_id", 2);
$.ajax({
    type: 'POST',
    url: "/pharmacy/countpatients/",
    data: formData,
    dataType: 'json',
    contentType: false,
    processData: false,
    headers: {
        'X-CSRFToken': csrftoken
    },
    success: function(response) {
        if(response.success) {
            var count = response.num.split("---");
            $("#patCount").html("<i class='fas fa-hospital-user'></i> &nbsp; Patients ("+count[0]+")");
            $("#req_count").html("<i class='fas fa-list'></i> &nbsp; Requests ("+count[1]+")");
        }
    },
    error: function(xhr, status, error) {
        console.log(error);
    }
});