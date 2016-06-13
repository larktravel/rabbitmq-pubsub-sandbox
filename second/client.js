var ws = new SockJS('http://127.0.0.1:15674/stomp');
var client = Stomp.over(ws);

var startTime = new Date();

client.heartbeat.outgoing = 20000; // client will send heartbeats every 20000ms
client.heartbeat.incoming = 0;     // client does not want to receive heartbeats

var hotelChannel = "hotel_stays"
var airfareChannel = "airfares"

var on_connect = function() {
  console.log('connected');
  var subscription = client.subscribe(hotelChannel, function(message) {
    var response = JSON.parse(message.body)
    console.log("message from server", response)
    $("#hotel_stay_response").prepend("<li>This took " +
      (new Date() - startTime) +
    " milliseconds</li>")
  });

  var subscription = client.subscribe(airfareChannel, function(message) {
    var response = JSON.parse(message.body)
    console.log("message from server", response)
    $("#airfares_response").prepend("<li>This took " +
      (new Date() - startTime) +
    " milliseconds</li>")

  });
};
var on_error =  function() {
   console.log('error');
};
client.connect('guest', 'guest', on_connect, on_error, '/');

$(document).ready(function() {
  $("#hotel_stay_button").click(function() {
    startTime = new Date();
    for(var i = 0; i < 100; i++) {
      client.send("/queue/HOTEL_STAY_REQUEST",
        {durable: true, "content-type":"text/json"},
        JSON.stringify({
          user_channel: hotelChannel,
          hotel_code: "0013522",
          check_in_at:  "2016-09-14",
          check_out_at: "2016-09-28",
          passenger_count: 2,
          room_count: 1,
          refresh: true
        })
      );
    }
  })
})

$(document).ready(function() {
  $("#airfares_button").click(function() {
    startTime = new Date();
    var counter = 1;
    for(var i = 2; i < 30; i++) {
      client.send("/queue/AIRFARE_REQUEST",
        {durable: true, "content-type":"text/json"},
        JSON.stringify({
          user_channel: airfareChannel,
          origin: "NYC",
          destination: "LON",
          departs_at: "2016-09-01",
          returns_at: "2016-09-" + i,
          cabin_class: "Y",
          passengers: 2,
          results: 50,
          request_key: "2016-09-" + i,
          refresh: true
        })
      );
      console.log("sent message", counter++);
    }
    for(var i = 2; i < 30; i++) {
      client.send("/queue/AIRFARE_REQUEST",
        {durable: true, "content-type":"text/json"},
        JSON.stringify({
          user_channel: airfareChannel,
          origin: "NYC",
          destination: "LON",
          departs_at: "2016-10-01",
          returns_at: "2016-10-" + i,
          cabin_class: "Y",
          passengers: 2,
          results: 50,
          request_key: "2016-10-" + i,
          refresh: true
        })
      );
      console.log("sent message", counter++);
    }
  })
})
