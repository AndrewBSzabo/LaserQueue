// when document is loaded then number of lasers is determined and a loop is initiated to keep the page insync with airtable
$(document).ready(function() {
    // get rid of context menu on right click or long press
    $(document).bind("contextmenu",function(e){
      return false;
    });
  
    // call to server.js to get number of lasers in airtable
    $.getJSON('/init', function(response) {
      // for each laser in airtable create add a corresponding visual to 'lasers' and a checkbox to 'checkboxs'
      for (var i = 0; i < response.length; i++){
        // add visual
        $("#lasers").append("<div class='laser' id='" + response[i].id + "'><b>" + response[i].fields.Name + "</b><br><div id='open'>Open</div></div>");
        $("#" + response[i].id).css("background-color", "green");
      }
    });
  
    // loop to keep documnet in sync with airtable
    setInterval(function() {
      keepSync();
    }, 1000);
  });

// updates html to visualize when a user is added to the queue
function joinHTMLQueue(userData) {  
    // append name of user to 'list' with the same id as the user has in airtable
    var time = timeFromDate(userData.fields["Time: Joined Queue"]);

    $("#list").append("<li id='" + userData.id + "'><div>" + userData.fields.Name + "</div><div class='time'>"+ time +"</div></li>");
}


// function that is used to keep the client page insync with airtable
function keepSync() {
    // get info from server.js about status of airtable lasers and queue
    $.getJSON('/updatePage', function(response) {
        // for every open laser in airtable, if that laser is not open on the client page, then make the laser open on the client page
        for(var i = 0; i < response.openLasers.length; i++) {
        if($("#" + response.openLasers[i].id + " div").attr("ID") != null && $("#" + response.openLasers[i].id + " div").attr("ID") != "Open") {
            setLaserOpen(response.openLasers[i].id);
        }
        }
        // for every out of order laser in airtable, if that laser is not out of order on the client page, then make the laser out of order on the client page
        for(var i = 0; i < response.OoOLasers.length; i++) {
        if($("#" + response.OoOLasers[i].id + " div").attr("ID") != "OoO") {
            setLaserOoO(response.OoOLasers[i].id);
        }
        }
        // for every occupied laser in airtable, if that lser is not occupied on the client page, then make the laser occupied on the client page
        for(var i = 0; i < response.occupiedLasers.length; i++) {
        if($("#" + response.occupiedLasers[i].id + " div").attr("ID") != response.occupiedLasers[i].fields.Using[0]) {
            setLaserOccupied(response.occupiedLasers[i].id,response.occupiedLasers[i].fields.Using[0]);
        }
        }
        var check = 0;
        // if queue in airtable is same length as queue on client page
        if(response.queueInfo.length == $("#list li").length) {
            // while we are in range of the queue, if at any point the airtable queue does not match the client page queue then exit loop (check != queue length)
            while(check < response.queueInfo.length) {
            if(response.queueInfo[check].id != $("#list li:eq(" + check + ")").attr("ID") || response.queueInfo[check].fields.Name != $("#list li:eq(" + check + ")").text()) {
                break;
            }
            check++;
            }
        }
        // if airtable queue is not same length as client page queue or check != queue length then update client page queue to match airtable queue
        if (response.queueInfo.length != $("#list li").length || check != response.queueInfo.length) {
            $("#list").empty();
            for (var i = 0; i < response.queueInfo.length; i++) {
            joinHTMLQueue(response.queueInfo[i]);
            }
        }
    });
    }

// change status of laser with laserID to open on client page
function setLaserOpen(laserID) {
    $("#" + laserID + " div").remove();
    $("#" + laserID).append("<div id='Open'>Open</div>").css("background-color", "green");
}

// change status of laser with laserID to out of order on client page
function setLaserOoO(laserID) {
    if ($("#" + laserID + " div").attr("ID") != null) {
        $("#" + laserID + " div").remove();
    }
    $("#"+ laserID).css("background-color", "red").append('<div id=OoO>Out of Order</div>');
}

// change status of laser with laserID to occupied by user with userID on client page
function setLaserOccupied(laserID, userID) {
    // send userID to server.js to get info of user from airtable
    $.getJSON('/userInLaserInfo',{
        id: userID
    },function(response) {
        // if the user is in a laser then add that user to the laser on client page
        if(response.fields.Laser_Using != null) {
            // if the laser is not empty on the client page then make the laser empty so that the current user can be added
            if ($("#" + laserID + " div").attr("ID") != null) {
                $("#" + laserID + " div").remove();
            }
            time = timeFromDate(response.fields["Time: Join Laser"]);
            // append user name and 'done' button to laser with laserID
            $("#" + response.fields.Laser_Using[0]).css("background-color", "#EBB22A").append('<div id="'+ response.id +'">'+ response.fields.Name + '<br>' + time + '</div>');
        }
    });
}

function timeFromDate(rawDate) {
    var date = new Date(rawDate);
    var hours = date.getHours();
    var am = true;
    if (hours > 12) {
        am = false;
        hours -= 12;
    } else if (hours == 12) {
        am = false;
    } else if (hours == 0) {
        hours = 12;
    }
    return hours + ":" + date.getMinutes() + (am ? " AM" : " PM");
}