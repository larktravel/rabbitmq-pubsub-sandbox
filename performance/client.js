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

var on_connect = function() {
  console.log('connected');
  var subscription = client.subscribe(hotelChannel, function(message) {
    var response = JSON.parse(message.body)
    console.log("message from server", response)
    $("."+ response.check_in_at).append(
      "<td class='hotel-response'>"+ message.body.substring(0, lengthOfResponse) + "</td>"
    );
  });

  var subscription = client.subscribe(airfareChannel, function(message) {
    var response = JSON.parse(message.body)
    console.log("message from server", response)
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


var sendHotelStayRequest = function (counter, date) {
  $(".hotel-response").remove()
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
     refresh: true,
     request_key: hotelRequestKey(counter, date)
   })
  );
};

$(document).ready(function() {
  $("#hotel_stay_toggle").click(function() {
    $(".hotel-stays-table").toggle();
  });

  $("#hotel_stay_button").click(function() {
    var startDate = new moment();
    for(var i = 0; i < iterations; i++) {
      console.log("iteration", i);
      sendHotelStayRequest(i, startDate);
    };
  });
})

var populateHotelTable = function(counter, date) {
  var startDate = moment(date).add(counter, 'days').format('YYYY-MM-DD')
  $(".hotel-stays-table").append(
    "<tr class='" + startDate + "'><td>" + (counter + 1) + "</td>" +
    "<td>" + hotelCode + "</td>" +
    "<td>" + startDate + "</td>" +
    "<td>" + moment(date).add(counter + lengthOfStay, 'days').format('YYYY-MM-DD') + "</td>"
  )
}

var initializeHotelDates = function() {
  var startDate = new moment();
  for(var i = 0; i < iterations; i++) {
    populateHotelTable(i, startDate);
  };
}();
