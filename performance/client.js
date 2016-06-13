var ws = new SockJS('http://127.0.0.1:15674/stomp');
var client = Stomp.over(ws);


client.heartbeat.outgoing = 20000; // client will send heartbeats every 20000ms
client.heartbeat.incoming = 0;     // client does not want to receive heartbeats

// CONSTANTS
var hotelChannel = "hotel_stays"
var airfareChannel = "airfares"
var iterations = 30;
var hotelCode = "0013522";

var on_connect = function() {
  console.log('connected');
  var subscription = client.subscribe(hotelChannel, function(message) {
    var response = JSON.parse(message.body)
    console.log("message from server", response)
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

$(document).ready(function() {
  initializeHotelDates();
})

var initializeHotelDates = function() {
  var startDate = new moment();
  for(var i = 0; i < iterations; i++) {
    populateHotelTable(i, startDate);
  };
}
var populateHotelTable = function(counter, date) {
  $(".hotel-stays-table").append(
    "<tr><td>" + counter + "</td>" +
    "<td>" + hotelCode + "</td>" +
    "<td>" + moment(date).add('days', counter).format('YYYY-MM-DD') + "</td>" +
    "<td>" + moment(date).add('days', counter + 1).format('YYYY-MM-DD') + "</td>"
  )
}

var sendHotelStayRequest = function (depart_date, return_date) {
  client.send(
   "/queue/HOTEL_STAY_REQUEST",
   {durable: true, "content-type":"text/json"},
   JSON.stringify({
     user_channel: hotelChannel,
     hotel_code: hotelCode,
     check_in_at:  moment(depart_date).format("YYYY-MM-DD"),
     check_out_at: moment(return_date).format("YYYY-MM-DD"),
     passenger_count: 2,
     room_count: 1,
     refresh: true
   })
  );
};
