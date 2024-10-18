$(document).ready(function () {


    // Get cookie values
    function getCookie(name) {
        var cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            var cookies = document.cookie.split(';');
            for (var i = 0; i < cookies.length; i++) {
                var cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }


    function cap(str) {
        var txt = str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
        return txt;
    }

    var uu_iid = getCookie('uu_iid');
    
    if(uu_iid !== null) {
        $("#welback").html("Labolatory<br>Welcome back, "+cap(uu_iid));
    }

    // Dashboard clock
    function timeDisplay() {
        const today = new Date();

        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];

        const dayName = dayNames[today.getDay()];
        const day = (today.getDate() < 10) ? '0'+today.getDate() : today.getDate();
        const month = monthNames[today.getMonth()];
        const year = today.getFullYear();
        const hours = (today.getHours() < 10) ? '0'+today.getHours() : today.getHours();
        const minutes = (today.getMinutes() < 10) ? '0'+today.getMinutes() : today.getMinutes();
        const seconds = (today.getSeconds() < 10) ? '0'+today.getSeconds() : today.getSeconds();

        const ft_date = `${dayName}, ${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
        $("#date_time").text(ft_date);
        $("#date_time").css("color", "#696969");
    }
    setInterval(timeDisplay,1000);
  
});