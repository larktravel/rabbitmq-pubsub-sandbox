var ws = new SockJS('http://127.0.0.1:15674/stomp');
var client = Stomp.over(ws);

var on_connect = function() {
  console.log('connected');
  var subscription = client.subscribe("server", function(message) {
    console.log("message from server", message)
  });
};
var on_error =  function() {
   console.log('error');
};
client.connect('guest', 'guest', on_connect, on_error, '/');

$(document).ready(function() {
  $("#super_button").click(function() {
    console.log("sending message")
    client.send("/queue/sandbox", {durable: true, "content-type":"text/json"}, JSON.stringify({message: "Hello, STOMP"}));
  })
})
