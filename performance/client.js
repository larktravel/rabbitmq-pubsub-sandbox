var ws = new SockJS('http://127.0.0.1:15674/stomp');
var client = Stomp.over(ws);


client.heartbeat.outgoing = 20000; // client will send heartbeats every 20000ms
client.heartbeat.incoming = 0;     // client does not want to receive heartbeats

// CONSTANTS
var hotelChannel = "hotel_stays"
var airfareChannel = "airfares"
var iterations = 100;
var hotelCode = "0013522";
var lengthOfStay = 3;
var lengthOfResponse = 50;
var hotelStartTime = null;
var hotelStayLengths = [];
window.hotelStayLengths = hotelStayLengths;

var airfareStartTime = null;
var airfareOrigin = "NYC";
var airfareDestination = "PAR";
var airfareStayLengths = [];

var hotelResponseCallback = function(message) {
  var response = JSON.parse(message.body)
  console.log("message from server", response)
  $("#hotel-end-time").html(moment().format())
  var timeTaken = new Date() - hotelStartTime;
  hotelStayLengths.push(timeTaken);
  $("#hotel-duration").html(
    moment.duration(timeTaken).asSeconds()
  )
  $("#hotel-stay-mean").html(_.mean(hotelStayLengths)/1000);
  $(".hotel-"+ response.check_in_at).append(
    "<td class='hotel-response'>"+ message.body.substring(0, lengthOfResponse) + "</td>"
  );
}

var airfareResponseCallback = function(message) {
  var response = JSON.parse(message.body)
  console.log("message from server", response)
  $("#air-end-time").html(moment().format())
  var timeTaken = new Date() - airfareStartTime;
  airfareStayLengths.push(timeTaken);
  $("#air-duration").html(
    moment.duration(timeTaken).asSeconds()
  )
  $("#airfare-mean").html(_.mean(airfareStayLengths)/1000);
  $(".airfare-"+ response.request_key.replace(/\|/g, "-")).append(
    "<td class='airfare-response'>"+ message.body.substring(0, lengthOfResponse) + "</td>"
  );
}

var on_connect = function() {
  console.log('connected');
  var subscription = client.subscribe(hotelChannel, function(message) {
    hotelResponseCallback(message)
  });

  var subscription = client.subscribe(airfareChannel, function(message) {
    airfareResponseCallback(message)
  });
};
var on_error =  function() {
   console.log('error');
};

client.connect('guest', 'guest', on_connect, on_error, '/');

var hotelRequestKey = function(counter, date) {
  return hotelCode + "|" +
    moment(date).add(counter, 'days').format("YYYYMMDD") + "|" +
    moment(date).add(counter + lengthOfStay, 'days').format("YYYYMMDD") + "|2|1";
}

var airfareRequestKey = function(counter, date) {
  return airfareOrigin + "|" + airfareDestination + "|" +
    moment(date).add(counter, 'days').format("YYYYMMDD") + "|" +
    moment(date).add(counter + lengthOfStay, 'days').format("YYYYMMDD") + "|Y|2";
}

var sendHotelStayRequest = function (counter, date) {
  $(".hotel-response").remove()
  hotelStartTime = new Date();
  $("#hotel-start-time").html(moment(hotelStartTime).format())
  client.send(
   "/queue/HOTEL_STAY_REQUEST",
   {durable: true, "content-type":"text/json"},
   JSON.stringify({
     user_channel: hotelChannel,
     hotel_code: hotelCode,
     check_in_at:  moment(date).add(counter, 'days').format("YYYY-MM-DD"),
     check_out_at: moment(date).add(counter + lengthOfStay, 'days').format("YYYY-MM-DD"),
     passenger_count: 2,
     room_count: 1,
     refresh: false,
     request_key: hotelRequestKey(counter, date)
   })
  );
};

var sendAirfareRequest = function (counter, date) {
  $(".airfare-response").remove()
  airfareStartTime = new Date();
  $("#air-start-time").html(moment(airfareStartTime).format())
  client.send(
    "/queue/AIRFARE_REQUEST",
    {durable: true, "content-type":"text/json"},
    JSON.stringify({
      user_channel: airfareChannel,
      origin: airfareOrigin,
      destination: airfareDestination,
      departs_at: moment(date).add(counter, 'days').format("YYYY-MM-DD"),
      returns_at: moment(date).add(counter + lengthOfStay, 'days').format("YYYY-MM-DD"),
      cabin_class: "Y",
      passengers: 2,
      results: 50,
      request_key: airfareRequestKey(counter, date),
      refresh: false,
    })
  );
};

$(document).ready(function() {
  $("#hotel_stay_toggle").click(function() {
    $(".hotel-stays-table").toggle();
  });

  $("#airfare_toggle").click(function() {
    $(".airfares-table").toggle();
  });

  $("#hotel_stay_button").click(function() {
    hotelStartTime = new Date();
    $("#hotel-start-time").html(moment(hotelStartTime).format())
    var startDate = new moment();
    for(var i = 0; i < iterations; i++) {
      sendHotelStayRequest(i, startDate);
    };
  });

  $("#airfares_button").click(function() {
    airfareStartTime = new Date();
    $("#airfare-start-time").html(moment(airfareStartTime).format())
    var startDate = new moment();
    for(var i = 0; i < iterations; i++) {
      sendAirfareRequest(i, startDate);
    };
  });
})

var populateHotelTable = function(counter, date) {
  var startDate = moment(date).add(counter, 'days').format('YYYY-MM-DD')
  $(".hotel-stays-table").append(
    "<tr class='hotel-" + startDate + "'><td>" + (counter + 1) + "</td>" +
    "<td>" + hotelCode + "</td>" +
    "<td>" + startDate + "</td>" +
    "<td>" + moment(date).add(counter + lengthOfStay, 'days').format('YYYY-MM-DD') + "</td></tr>"
  )
}

var populateAirfareTable = function(counter, date) {
  var startDate = moment(date).add(counter, 'days').format('YYYY-MM-DD')
  $(".airfares-table").append(
    "<tr class='airfare-" + airfareRequestKey(counter, date).replace(/\|/g, "-") +"'><td>" +
    (counter + 1) + "</td>" +
    "<td>" + airfareOrigin + "</td>" +
    "<td>" + airfareDestination + "</td>" +
    "<td>" + startDate + "</td>" +
    "<td>" + moment(date).add(counter + lengthOfStay, 'days').format('YYYY-MM-DD') + "</td></tr>"
  )
}

var initializeTables = function() {
  var startDate = new moment();
  for(var i = 0; i < iterations; i++) {
    populateHotelTable(i, startDate);
    populateAirfareTable(i, startDate);
  };
}();
