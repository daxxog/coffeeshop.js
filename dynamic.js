/* coffeeshop.js / dynamic.js
 * example of a dynamic server [serve up that express-o in your coffeeshop.js]
 * (c) 2012 David (daXXog) Volm ><> + + + <><
 * Released under Apache License, Version 2.0:
 * http://www.apache.org/licenses/LICENSE-2.0.html  
 */

/* UMD LOADER: https://github.com/umdjs/umd/blob/master/returnExports.js */
(function (root, factory) {
    if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like enviroments that support module.exports,
        // like Node.
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(factory);
    } else {
        // Browser globals (root is window)
        root.returnExports = factory();
  }
}(this, function() {
    var dynamic = {};
    
    dynamic.bind = function(pass, grab, data) {
        var app = grab('app', pass);
        
        app.get('/expresso', function(req, res) {
            var io = app.fakeIO('user'); //create some fake io for 'user'
            io.emit('alert', 'coffeeshop.js is cool! alert() is not!'); //emit a message using fake io
            res.send(app.get('message')); //send another message using res
        });
        
        app.sockAuth(function(obj, setID, accept) { //insecure socket authentication
            setID('user'); //set the id to 'user'
            accept(null, true); //accept the socket
        });
    };
    
    return dynamic;
}));