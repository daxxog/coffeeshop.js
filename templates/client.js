var cash = new Cash(50,75);
var socket = io.connect('http://'+window.location.host);
socket.on('alert', function(msg) {
    alert(msg+' cash.js is cool too: $'+cash.toNumber());
});