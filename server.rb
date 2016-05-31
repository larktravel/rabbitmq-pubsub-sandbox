require 'bundler'
Bundler.require

conn = Bunny.new
conn.start

ch = conn.create_channel
q  = ch.queue("sandbox", :durable => true)
x  = ch.default_exchange

q.subscribe(block: true) do |delivery_info, properties, payload|
  puts "recieved payload #{payload}"
  x.publish({time: Time.now, msg: "Hello!"}.to_json, :routing_key => "server")
end

sleep 1.0
conn.close
