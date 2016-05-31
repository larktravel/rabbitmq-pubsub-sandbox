var ws = new SockJS('http://127.0.0.1:15674/stomp');
var client = Stomp.over(ws);

client.heartbeat.outgoing = 20000; // client will send heartbeats every 20000ms
client.heartbeat.incoming = 0;     // client does not want to receive heartbeats

var on_connect = function() {
  console.log('connected');
  var subscription = client.subscribe("server", function(message) {
    var blah = JSON.parse(message.body)
    console.log("message from server", blah)
    $("#responses").prepend("<li>" + blah.time + "</li>")

  });
};
var on_error =  function() {
   console.log('error');
};
client.connect('guest', 'guest', on_connect, on_error, '/');

$(document).ready(function() {
  $("#super_button").click(function() {
    console.log("sending message")
    client.send("/queue/sandbox",
      {durable: true, "content-type":"text/json"},
      JSON.stringify({
        message: "Hello, STOMP", time: new Date()
      })
    );
  })
})
