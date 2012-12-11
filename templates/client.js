var socket = io.connect('http://'+window.location.host);
socket.on('alert', function(msg) {
    alert(msg);
});