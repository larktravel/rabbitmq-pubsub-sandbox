var ws = new SockJS('http://127.0.0.1:15674/stomp');

var client = Stomp.over(ws, {debug: false});
client.heartbeat.outgoing = 20000; // client will send heartbeats every 20000ms
client.heartbeat.incoming = 0;     // client does not want to receive heartbeats

// CONSTANTS
var hotelChannel = "hotel_stays"
var airfareChannel = "airfares"
var iterations = 100;
var hotelCodes = [
  "0147479", "0225620", "0050493", "0078300", "0065185",
  "0062024", "0020365", "0013741", "0143817", "0006972",
  "0006958", "0020136", "0177969", "0009167", "0135257",
  "0072065", "0162866", "0004784", "0077661", "0032495",
  "0001211", "0085356", "0175246", "0064165", "0236744"
]
var airportCodes = ["LON", "PAR", "MIA", "LAX", "MLE", "CUN"]
var lengthOfStay = 3;
var lengthOfResponse = 25;
var randomDateRange = 100;

var searchesAtOnce = 25;
var timeBetweenSearches = 3000;

var startTime = null;
var queryLengths = [];
var counter = 1;

// graph data
var hotelGraphData = [];
var airGraphData = [];
window.hotelGraphData = hotelGraphData;
window.airGraphData = airGraphData;

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


var updateStatsRow = function(type, transactionTime) {
  var now = new Date();
  $(".end-time").last().html(now)
  var totalTimeTaken = new Date() - startTime;
  queryLengths.push(transactionTime);
  if(type === "air") {
    airGraphData.push([totalTimeTaken/1000, transactionTime])
  } else {
    hotelGraphData.push([totalTimeTaken/1000, transactionTime])
  }

  $(".request-duration").last().html(
    moment.duration(totalTimeTaken).asSeconds()
  )
  $(".request-mean").last().html(_.mean(queryLengths))
}

var hotelResponseCallback = function(message) {
  var response = JSON.parse(message.body)
  //console.log("message from server", response)
  var transactionStartTime = response.timestamp
  updateStatsRow("hotel", transactionStartTime);
  $(".results-table").append(
    "<tr class='response-row' style='background: azure'>" +
      "<td>" + counter++ + "</td>" +
      "<td>Hotel Stay</td>" +
      "<td>" + response.request_key + "</td>" +
      "<td>" + response.check_in_at + "</td>" +
      "<td>" + response.check_out_at + "</td>" +
      "<td>" + moment.duration(new Date() - startTime).asSeconds() + "</td>" +
      "<td>" + transactionStartTime + "</td>" +
      "<td>" + message.body.substring(0, lengthOfResponse) + "</td>" +
    "</tr>"
  )
}

var airfareResponseCallback = function(message) {
  var response = JSON.parse(message.body)
  //console.log("message from server", response)
  var transactionStartTime = response.timestamp
  updateStatsRow("air", transactionStartTime);
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
      "<td>" + transactionStartTime + "</td>" +
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
     //timestamp: Number(new Date()),
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
      //timestamp: Number(new Date()),
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

var drawGraph = function() {
  $('.graph').highcharts({
    chart: {
        type: 'scatter',
        zoomType: 'xy'
    },
    title: {
        text: 'Time Taken From Responses over Time'
    },
    subtitle: {
        text: 'Koushik is the greatest'
    },
    xAxis: {
        title: {
            enabled: true,
            text: 'Time'
        },
        startOnTick: false,
        endOnTick: false,
        showLastLabel: true
    },
    yAxis: {
        title: {
            text: 'Response Time'
        }
    },
    legend: {
        layout: 'vertical',
        align: 'left',
        verticalAlign: 'top',
        x: 100,
        y: 70,
        floating: true,
        backgroundColor: (Highcharts.theme && Highcharts.theme.legendBackgroundColor) || '#FFFFFF',
        borderWidth: 1
    },
    plotOptions: {
        scatter: {
            marker: {
                radius: 5,
                states: {
                    hover: {
                        enabled: true,
                        lineColor: 'rgb(100,100,100)'
                    }
                }
            },
            states: {
                hover: {
                    marker: {
                        enabled: false
                    }
                }
            },
            tooltip: {
                headerFormat: '<b>{series.name}</b><br>',
                pointFormat: '{point.x} sec, {point.y} sec'
            }
        }
    },
    series: [{
        name: 'Hotel Stays',
        color: 'rgba(223, 83, 83, .5)',
        data: hotelGraphData

    }, {
        name: 'Air',
        color: 'rgba(119, 152, 191, .5)',
        data: airGraphData
    }]
  });
}

$(document).ready(function() {
  $("#trip_button").click(function() {
    startTime = new Date();
    counter = 1;
    addStatsRow()
    $(".response-row").remove();
    for(var i = 0; i < searchesAtOnce; i++) {
      setTimeout(function() {
        var date = randomDate();
        var airportCode = _.sample(airportCodes)
        sendAirfareRequest(airportCode, date)

        for(var j = 0; j < 3; j++) {
          var hotelCode = _.sample(hotelCodes)
          sendHotelStayRequest(hotelCode, date)
        }
      }, timeBetweenSearches * i);
    }
  });
  setInterval(function() {
    drawGraph();
  }, 10000)
})

