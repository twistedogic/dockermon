var Docker = require('dockerode');
var fs = require('fs');
var query = fs.readFileSync(__dirname+'/query.json');
var targetIP = '192.168.100.70'; //process.argv[2]
var redisIP = '192.168.100.74';
var docker = new Docker({host: 'http://' + targetIP, port: 4243});
var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
  host: targetIP + ':9200'
});

var hipchat = require('node-hipchat');
var HC = new hipchat('f7fa37cff308a1ca6b9b61f38aa18b');

var redis = require("redis");
var redisclient = redis.createClient(6379, redisIP, {})
var request = require('request');

setInterval(function() {
docker.listContainers(function (err, containers) {
    containers.forEach(function (containerInfo) {
        redisclient.set(containerInfo.Names[0].substring(1), containerInfo.Id);
    });
});
client.search({
    body: JSON.parse(query)
}).then(function (body) {
  var hits = body.hits.hits;
  hits = hits[0];
  console.log(hits);
  if(hits){
      redisclient.keys(hits._id,function(err,res){
          console.log(res);
          if(res.length < 1){
            console.log(hits._source.program);
            redisclient.get(hits._source.program,function(err,res){
                var container = docker.getContainer(res);
                console.log(container);
                var params = {
                    room: 'Alert', // Found in the JSON response from the call above
                    from: 'System',
                    message: 'Restarted' + JSON.stringify(container),
                    color: 'red'
                };
                HC.postMessage(params, function(data) {
                    console.log(data);
                });
                container.restart(function(err){
                    if(err){
                        console.log(err);
                    }
                });
                request.post('https://qpush.me/pusher/push_site/',
    	            {form:{"name":"twistedogic","code":"262156","sig":"","cache":"false","msg[text]":'Restarted' + JSON.stringify(container)}
    	           });
            });
            redisclient.set(hits._id,1);
            redisclient.keys('*',function(err,response){
                response.forEach(function(keyName){
                    redisclient.del(keyName);
                });
            });
          }
      })
    
  }
}, function (error) {
  console.trace(error.message);
});
},1000);
