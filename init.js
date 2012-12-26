/* coffeeshop.js / init.js
 * example of an init function
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
    return function(pass, grab, data) { //custom init function
        var client = grab('client', pass), //grab the redis client
            app = grab('app', pass); //grab the express app
        
        console.log('init()');
        
        client.exists("tokens", function(err, exists) { //check if tokens exist
            app.error(err, 'Error finding if tokens exist.');
            
            if(exists !== 1) { //parse response (IF NOT EXIST)
                client.set("tokens", "0", function(err, reply) { //create the tokens
                    app.error(err, 'Error in tokens init.');
                });
            }
        });
    };
}));