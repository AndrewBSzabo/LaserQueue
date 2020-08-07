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
      $("#lasers").append("<li id='" + response[i].id + "'><b>" + response[i].fields.Name + "</b><br><div id='open'>Open</div></li>");
      $("#lasers li:eq(" + i + ")").css("background-color", "green");

      // add checkbox
      $("#checkboxs").append("<input id='checkbox-" + response[i].id + "' type='checkbox' name='pref' value='" + response[i].id + "'/><label for='checkbox-" + response[i].id + "'>" + response[i].fields.Name + "</label><br>");
    }
  });

  // loop to keep documnet in sync with airtable
  setInterval(function() {
    keepSync();
  }, 1000);
});

// takes information from 'info' form and adds it as a user in airtable and changes the necessary html
function addUser() {
  // determine which preferences the user has
  var pref = new Array();
  $("#checkboxs input:checkbox[name=pref]:checked").each(function(){
      pref.push($(this).val());
  });
  
  // crates json data of user info to send to server.js
  var userInfo= {
    Name: document.info.name.value,
    Phone_Number: document.info.phone.value,
    Preferences: pref
  }

  // sends info to server.js so the user can be added to airtable
  $.getJSON('/addUser',userInfo, function(userData) {
    // adds user to the queue visually
    joinHTMLQueue(userData);
    document.info.reset();
  });
}

// updates html to visualize when a user is added to the queue
function joinHTMLQueue(userData) {
  var name = userData.fields.Name;

  // append name of user to 'list' with the same id as the user has in airtable
  $("#list").append("<li id='" + userData.id + "'><div id='name' class='queue'>" + name + "</div><div class='tooltipqueue'><button class='right button' id='btn" + userData.id + "'>Leave Queue</button><span class='tooltiptextqueue "+ userData.id +"'>Are you sure?<button class='done button' id='ybtn"+ userData.id +"'>Y</button><button class='done button' id='nbtn"+ userData.id +"'>N</button></span></div></li>");

  // adds functionality to 'Done' button
  document.getElementById("btn" + userData.id).addEventListener("click",function(e) {
    var tgt = e.target;
    if (tgt.tagName.toUpperCase() == "BUTTON") {
      $("#btn" + userData.id).hide();
      $("." + userData.id).css("visibility","visible");
      $("#ybtn" + userData.id).show();
      $("#nbtn" + userData.id).show();
    }
  });

  // adds functionality to 'Y' button on confirmation page
  document.getElementById("ybtn" + userData.id).addEventListener("click",function(e) {
    var tgt = e.target;
    if (tgt.tagName.toUpperCase() == "BUTTON") {
      // sends info to server.js so the user can be removed from the queue in airtable as well
      $.getJSON('/archive',{
        id: userData.id,
        Name: userData.fields.Name,
        Phone_Number: userData.fields.Phone_Number
      },function(response) {
        document.getElementById(userData.id).remove();
      });
    }
  });

  // adds functionality to 'N' button on confirmation page
  document.getElementById("nbtn" + userData.id).addEventListener("click",function(e) {
    var tgt = e.target;
    if (tgt.tagName.toUpperCase() == "BUTTON") {
      $("#ybtn" + userData.id).hide();
      $("#nbtn" + userData.id).hide();
      $("." + userData.id).css("visibility","hidden");
      setTimeout(function(){
      }, 1000); 
      $("#btn" + userData.id).show();
    }
  });
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
        if(response.queueInfo[check].id != $("#list li:eq(" + check + ")").attr("ID") || response.queueInfo[check].fields.Name != $("#list li:eq(" + check + ") #name").text()) {
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
  $("#lasers li[id= '"+ laserID +"']").css("background-color", "red").append('<div id=OoO>Out of Order</div>');
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
      var name = response.fields.Name;

      // append user name and 'done' button to laser with laserID
      $("#lasers li[id= '"+ response.fields.Laser_Using[0] +"']").css("background-color", "#EBB22A").append('<div id="'+ response.id +'"><div id="name" class="laser">'+ name + '</div><div class="tooltip"><button class="done button" id="btn'+ response.id +'">Done</button><span class="tooltiptext '+ response.id +'">Are you sure?<br><button class="done button" id="ybtn'+ response.id +'">Y</button><button class="done button" id="nbtn'+ response.id +'">N</button></span></div></div>');

      // add functionality to 'Done' button
      document.getElementById("btn" + response.id).addEventListener("click",function(e) {
        var tgt = e.target;
        if (tgt.tagName.toUpperCase() == "BUTTON") {
          $("#btn" + response.id).hide();
          $("." + response.id).css("visibility","visible");
          $("#ybtn" + response.id).show();
          $("#nbtn" + response.id).show();
        }
      });

      // add functionality to 'Y' button on confirmation page
      document.getElementById("ybtn" + response.id).addEventListener("click",function(e) {
        var tgt = e.target;
        if (tgt.tagName.toUpperCase() == "BUTTON") {
          // sends info to server.js so the user can be removed from the queue in airtable as well
          $.getJSON('/archive',{
            id: response.id,
            Name: response.fields.Name,
            Phone_Number: response.fields.Phone_Number,
            Laser_Using : response.fields.Laser_Using
          }, function(response) {
            // set laser open when 'done' button is held for necessary time
            setLaserOpen(laserID);
          });
        }
      });

      // adds functionality to 'N' button on confirmation page
      document.getElementById("nbtn" + response.id).addEventListener("click",function(e) {
        var tgt = e.target;
        if (tgt.tagName.toUpperCase() == "BUTTON") {
          $("#ybtn" + response.id).hide();
          $("#nbtn" + response.id).hide();
          $("." + response.id).css("visibility","hidden");
          setTimeout(function(){
          }, 1000); 
          $("#btn" + response.id).show();
        }
      });
    }
  });
}