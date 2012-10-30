var express = require('express');
var nodestatic = require('node-static');
var mu = require('mu2');
var stream = require('stream');

var file = new(nodestatic.Server)('./');
var app = express();

app.get('/', function(req, res){
    req.addListener('end', function () {
        var writestream = new stream.Stream();
        writestream.writable = true;
        writestream.write = function (data) {
          return true // true means 'yes i am ready for more data now'
          // OR return false and emit('drain') when ready later
        }
        writestream.end = function (data) {
          // no more writes after end
          // emit "close" (optional)
        }
        //
        // Serve files!
        //
        var stream = mu.compileAndRender('index.html', {title: "coffeeshop.js"});
        //file.serve(req, res);
        stream.pipe(res);
        //console.log(stream);
    });
    req.addListener('end', function () {
        console.log("END!");
    });
});

app.listen(process.env.PORT, process.env.IP);