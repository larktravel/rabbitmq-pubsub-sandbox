var ws = new SockJS('http://127.0.0.1:15674/stomp');

var client = Stomp.over(ws);
client.heartbeat.outgoing = 20000; // client will send heartbeats every 20000ms
client.heartbeat.incoming = 0;     // client does not want to receive heartbeats

// CONSTANTS
var hotelChannel = "hotel_stays"
var airfareChannel = "airfares"
var iterations = 100;
var hotelCodes = [
  "0064508", "0004787", "0059259", "0061236", "0058534", "0046290",
  "0059801", "0032611", "0057677", "0041581", "0199056", "0283882",
  "0056940", "0057349", "0059694", "0047806", "0147340", "0037391",
  "0013149", "0281513", "0024374", "0037130", "0061180", "0012181", "0110044"
];
var airportCodes = ["LON", "PAR", "MIA", "LAX", "MLE", "CUN"]
var lengthOfStay = 3;
var lengthOfResponse = 25;
var randomDateRange = 100;

var searchesAtOnce = 25;

var startTime = null;
var queryLengths = [];
var counter = 1;

var addStatsRow = function() {
  $(".stats").append(
    "<tr class='stats-row'>" +
      "<td class='start-time'>" + startTime + "</td>" +
      "<td class='end-time'> 0 </td>" +
      "<td class='request-duration'> 0 </td>" +
      "<td class='request-mean'> 0 </td>" +
    "<tr>"
  )
}

var updateStatsRow = function() {
  var now = new Date();
  $(".end-time").last().html(now)
  var timeTaken = new Date() - startTime;
  queryLengths.push(timeTaken);
  $(".request-duration").last().html(
    moment.duration(timeTaken).asSeconds()
  )
  $(".request-mean").last().html(_.mean(queryLengths)/1000)
}

var hotelResponseCallback = function(message) {
  var response = JSON.parse(message.body)
  console.log("message from server", response)
  updateStatsRow();
  var transactionStartTime = new Date(response.timestamp)
  $(".results-table").append(
    "<tr class='response-row' style='background: azure'>" +
      "<td>" + counter++ + "</td>" +
      "<td>Hotel Stay</td>" +
      "<td>" + response.request_key + "</td>" +
      "<td>" + response.check_in_at + "</td>" +
      "<td>" + response.check_out_at + "</td>" +
      "<td>" + moment.duration(new Date() - startTime).asSeconds() + "</td>" +
      "<td>" + moment.duration(new Date() - transactionStartTime).asSeconds() + "</td>" +
      "<td>" + message.body.substring(0, lengthOfResponse) + "</td>" +
    "</tr>"
  )
}

var airfareResponseCallback = function(message) {
  var response = JSON.parse(message.body)
  console.log("message from server", response)
  updateStatsRow();
  var transactionStartTime = new Date(response.timestamp)
  var dates = response.request_key.match(/.*(\d{8})\|(\d{8}).*/)
  var startDate = dates[1].slice(0,4) + "-" + dates[1].slice(4,6) + dates[1].slice(6)
  var endDate = dates[2].slice(0,4) + "-" + dates[2].slice(4,6) + dates[2].slice(6)
  $(".results-table").append(
    "<tr class='response-row' style='background: #9df39f'>" +
      "<td>" + counter++ + "</td>" +
      "<td> Airfare </td>" +
      "<td>" + response.request_key + "</td>" +
      "<td>" + startDate + "</td>" +
      "<td>" + endDate + "</td>" +
      "<td>" + moment.duration(new Date() - startTime).asSeconds() + "</td>" +
      "<td>" + moment.duration(new Date() - transactionStartTime).asSeconds() + "</td>" +
      "<td>" + message.body.substring(0, lengthOfResponse) + "</td>" +
    "</tr>"
  )
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

var hotelRequestKey = function(hotelCode, date) {
  return hotelCode + "|" +
    moment(date).format("YYYYMMDD") + "|" +
    moment(date).add(lengthOfStay, 'days').format("YYYYMMDD") + "|2|1";
}

var airfareRequestKey = function(airfareDestination, startDate) {
  return "NYC|" + airfareDestination + "|" +
    moment(startDate).format("YYYYMMDD") + "|" +
    moment(startDate).add(lengthOfStay, 'days').format("YYYYMMDD") + "|Y|2";
}

var sendHotelStayRequest = function (hotelCode, date) {
  client.send(
   "/queue/HOTEL_STAY_REQUEST",
   {durable: true, "content-type":"text/json"},
   JSON.stringify({
     user_channel: hotelChannel,
     hotel_code: hotelCode,
     check_in_at:  moment(date).format("YYYY-MM-DD"),
     check_out_at: moment(date).add(lengthOfStay, 'days').format("YYYY-MM-DD"),
     passenger_count: 2,
     room_count: 1,
     refresh: false,
     timestamp: new Date(),
     request_key: hotelRequestKey(hotelCode, date)
   })
  );
};

var sendAirfareRequest = function (airfareDestination, startDate) {
  client.send(
    "/queue/AIRFARE_REQUEST",
    {durable: true, "content-type":"text/json"},
    JSON.stringify({
      user_channel: airfareChannel,
      origin: "NYC",
      destination: airfareDestination,
      departs_at: moment(startDate).format("YYYY-MM-DD"),
      returns_at: moment(startDate).add(lengthOfStay, 'days').format("YYYY-MM-DD"),
      cabin_class: "Y",
      passengers: 2,
      results: 50,
      request_key: airfareRequestKey(airfareDestination, startDate),
      timestamp: new Date(),
      refresh: false,
    })
  );
};

var randomDate = function(){
  var today = new Date(Date.now());
  return new Date(
    today.getYear() + 1900,
    today.getMonth(),
    today.getDate() + Math.random() * randomDateRange
  )
}

$(document).ready(function() {

  $("#trip_button").click(function() {
    startTime = new Date();
    counter = 1;
    addStatsRow()
    $(".response-row").remove();
    for(var i = 0; i < searchesAtOnce; i++) {
      var date = randomDate();
      var airportCode = _.sample(airportCodes)
      sendAirfareRequest(airportCode, date)

      for(var j = 0; j < 3; j++) {
        var hotelCode = _.sample(hotelCodes)
        sendHotelStayRequest(hotelCode, date)
      }
    }
  });
})
