// express and app for server
var express = require('express');
var app = express();

var schedule = require('node-schedule');

// ENV to get environment variables
var ENV = require('dotenv');
ENV.config();

// Request to make http requests
var Request = require('request');

// Airtable for making calls to airtable database
var Airtable = require('airtable');
var base = new Airtable({apiKey: process.env.AIRTABLE_API_KEY}).base(process.env.AIRTABLE_BASE_ID);

app.use(express.static('public'));

// when website is visited home.html is displayed
app.get("/", function(request, response) {
  response.sendFile(__dirname + '/views/control.html');
});

// when website/display is visited display.html is displayed
app.get("/display", function(request,response) {
  response.sendFile(__dirname + '/views/display.html');
});

// sends initial info about lasers to client.js
app.get("/init", function(request, response) {
  var responseData = [];
  // grabs rows from 'Lasers' table (Lasers view) in airtable
  base('Lasers').select({
    view: "Lasers view"
  }).all().then(lasers => {
    // for every laser add that lasers information to responseData
    for(var i = 0; i < lasers.length; i++) {
      responseData.push(lasers[i]._rawJson);
    }
    // send responseData to client.js
    response.send(responseData);
  });
});

// sends information about laser and queue status to client.js
app.get("/updatePage", function(request, response) {
  var responseData = {
    openLasers: [],
    OoOLasers: [],
    occupiedLasers: [],
    queueInfo: []
  }

  // grabs rows from 'Lasers' table (Lasers view) in airtable
  base('Lasers').select({
    view: "Lasers view"
  }).all().then(lasers => {
    // for each laser..
    for(var i = 0; i < lasers.length; i++) {
      // if that laser is out of order then add that laser to OoOLasers in responseData
      if (lasers[i].get('Out_of_Order')) {
        if (lasers[i].get('Using') != null) {
          moveToQueue(lasers[i].get('Using')[0]);
        }
        responseData.OoOLasers.push(lasers[i]._rawJson);
      }
      // if that laser is in user then add that laser to OccupiedLasers in responseData 
      else if (lasers[i].get('Using') != null) {
        responseData.occupiedLasers.push(lasers[i]._rawJson);
      }
      // otherwise the laser is open so add that laser to openLasers in responseData 
      else {
        responseData.openLasers.push(lasers[i]._rawJson);
      }
    }

    // graps rows from 'Queue' table (Queue view) in airtable
    base('Queue').select({
      view: "Queue view"
    }).all().then(users => {
      // for every user in the queue add that user to queueInfo in responseData
      for(var i = 0; i < users.length; i++) {
        responseData.queueInfo.push(users[i]._rawJson);
      }

      // send responseData info to client.js
      response.send(responseData);
    });
  });
});

// when called from client.js, the request info is used to create a new user in the airtable queue
app.get("/addUser", function(request,response) {
  // create new record in 'Queue' table 
  base('Queue').create({
    "Name": request.query.Name,
    "Phone_Number": request.query.Phone_Number,
    "Preferences": request.query.Preferences,
    "Position": "Queue"
  }, function(err, record) {
    if(err) {
    console.error(err);
    return;
    }
    // if the new user has a phone number and they wont be imediatly put into a laserthen send that user the inQueueText
    else if (request.query.Phone_Number != '') {
      base('Lasers').select({
        view: "Open lasers view"
      }).all().then(lasers => {
        if (lasers.length == 0) {
          sendText(record.get('Phone_Number'), "Hello " + record.get('Name') + ", you have been added to the Laser Cutter Queue. You will recieve a text when it is your turn to use a laser cutter. Please have your job ready.");
        }
        else if (request.query.Preferences == undefined) {
          return;
        }
        else {
          for (var i = 0; i < lasers.length; i++) {
            for (var j = 0; j < request.query.Preferences.length; j++) {
              if (lasers[i].id == request.query.Preferences[j]) {
                return;
              }
            }
          }
          sendText(record.get('Phone_Number'), "Hello " + record.get('Name') + ", you have been added to the Laser Cutter Queue. You will recieve a text when it is your turn to use a laser cutter. Please have your job ready.");
        }
      });
    }
    console.log(record.get('Name') + " => Queue");
    // send info back to client.js so it can update the html page
    response.send(record._rawJson);
  });
});

// when called from client.js, the request info is used to grab info about a user in a laser from airtable
app.get('/userInLaserInfo',function(request,response) {
  // finds user with id = request.query.id (this user will be in a laser)
  base('Queue').find(request.query.id, function(err, record) {
    if (err) { 
      console.error(err); 
      return; 
    }
    // sends this user's information to client.js
    response.send(record._rawJson);
  });
});

// when called from cleint.js, the request info is used to mave a user into the archive table
app.get("/archive", function(request,response) {
  // update info of user with id = request.query.id such that the user is now in the archive
  base('Queue').update(request.query.id,{
    Position: "Archive",
    Phone_Number: "",
    Laser_Using: [],
  }, function(err, record) {
    if (err) {
      console.error(err);
      return;
    }
    // if the user is removed from a laser then send the leaveLaserText 
    else if (request.query.Phone_Number != null && request.query.Laser_Using != null) {
      sendText(request.query.Phone_Number, "Hello " + request.query.Name + ", you have left your laser cutter. If this was unintentional, please talk to a student technician.");
    }
    // if the user is removed from the queue then send the leaveQueueText
    else if (request.query.Phone_Number != null && request.query.Laser_Using == null) {
      sendText(request.query.Phone_Number, "Hello " + request.query.Name + ", you have left the queue. If this was unintentional, please talk to a student technician.");
    }
    console.log(request.query.Name + " => Archive");
    response.send(record._rawJson);
  });
});

// interval that constantly move users to a laser if an open laser exists 
var constantPop = setInterval(function() {
  pop();
}, 1000);

// when the server is terminated end the interval constantPop
process.on('SIGINT', function() {
  clearInterval(constantPop);
  process.exit();
});

var midnightClear = schedule.scheduleJob('0 4 * * *', function(){
  base('Queue').select({
    view: "Lasers or Queue view"
  }).eachPage(function page(users, fetchNextPage) {
      // This function (`page`) will get called for each page of records.

      users.forEach(function(user) {
        base('Queue').update(user._rawJson.id,{
          Position: "Archive",
          Phone_Number: "",
          Laser_Using: [],
        }, function(err, record) {
          if (err) {
            console.error(err);
            return;
          }
          else {
            console.log(record.get("Name") + "=> Archive");
          }
        });
      });

      // To fetch the next page of records, call `fetchNextPage`.
      // If there are more records, `page` will get called again.
      // If there are no more records, `done` will get called.
      fetchNextPage();

  }, function done(err) {
      if (err) { console.error(err); return; }
  });
});

// listener for localhost on port 8080
var listener = app.listen(8080, function() {
  console.log('Your app is listening on port ' + 8080);
});


// fills open lasers with users from the queue
function pop() {
  //grabs rows from 'Lasers' table (Open lasers view) in airtable
  base('Lasers').select({
    view: "Open lasers view"
  }).all().then(lasers => {
    // lasers stores information of every laser from 'Lasers' (Open lasers view)
    // grabs rows from 'Queue' table (Queue view) in airtable
    base('Queue').select({
      view: "Queue view"
    }).all().then(users => {
      // users stores information of ever user from 'Queue' (Queue view)
      // shuffle order of lasers (so that users will be assigned to a random open laser) 
      var lasersRandomOrder = shuffle(lasers);
      var queuePosition = 0;
      // for every open laser...
      for(var i = 0; i < lasersRandomOrder.length; i++) {
        var noOneAdded = true;
        // while no one has been added to the current laser and we have not gone through the entire queue
        while(noOneAdded && queuePosition < users.length) {
          // if the current user has no preferences then add that person to the current laser
          if (users[queuePosition].get('Preferences') == null) {
            moveToLaser(lasersRandomOrder[i], users[queuePosition]);
            console.log(users[queuePosition].get('Name') + " => " + lasersRandomOrder[i].get('Name'));
            noOneAdded = false;
          }
          // if the current user does have preferences... 
          else {
            // for each preference of the current user...
            for(var j = 0; j < users[queuePosition].get('Preferences').length; j++) {
              // if one of the users preferences is the current laser then add this current user to the current laser
              if (users[queuePosition].get('Preferences')[j] == lasersRandomOrder[i].id) {
                moveToLaser(lasersRandomOrder[i], users[queuePosition]);
                console.log(users[queuePosition].get('Name') + " => " + lasersRandomOrder[i].get('Name'));
                noOneAdded = false;
              }
            }
          }
          queuePosition++;
        }
      }
    });
  });
}

// moves user to queue in airtable
function moveToQueue(userID) {
  // update the information of the user to put that user back into the airtable queue
  base('Queue').update(userID, {
    Position: "Queue",
    Laser_Used: [],
    Laser_Using: []
  }, function(err, record) {
    if (err) {
      console.error(err);
      return;
    }
  });
}

// moves user to laser in airtable
function moveToLaser(laser, user) {
  // updates the airtable information of user to indicate that the user is now using laser
  base('Queue').update(user.id,{
    Position: "Lasers",
    Laser_Using: [laser.id],
    Laser_Used: [laser.id]
  }, function(err, record) {
    if (err) {
      console.error(err);
      return;
    }
    // if the user has a phone number then send them an inLaserText
    else if (user.get('Phone_Number') != null) {
      sendText(user.get('Phone_Number'), "Hello " + user.get('Name') + ", " + laser.get('Name') + " is ready for you to use. When your job is finished please make sure to click the 'Done' button on the Laser Cutter Queue.");
    }
  });
}

// randomizes the order of array
function shuffle(array) {
  var currentIndex = array.length;
  var temporaryValue;
  var randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

// makes http request based on options input
function sendText(phoneNumber, message) {
  var options = { 
    method: 'GET',
    url: 'https://platform.clickatell.com/messages/http/send?apiKey='+ process.env.CLICKATELL_API_KEY +'&to='+ phoneNumber +'&content='+ message+'&from=' + process.env.CLICKATELL_LONG_NUMBER
  }

  Request(options, function (error, response, body) {
    if (error) console.log(error);
  });
}