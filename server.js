/* coffeeshop.js / server.js
 * example of a running a static, dynamic, and hybrid server
 * (c) 2012 David (daXXog) Volm ><> + + + <><
 * Released under Apache License, Version 2.0:
 * http://www.apache.org/licenses/LICENSE-2.0.html  
 */

var cs = require('coffeeshop'),
    dynamic = require('./dynamic.js'),
    hybrid = require('./hybrid.mongodb.mustache.uglify-js.less');
    
cs.set('message', 'Hello World!'); //pass a message to dynamic
cs.set('hybrid-timer', 3000); //set the update interval for hybrid pages
cs.bind(dynamic); //bind the dynamic server to the app
cs.bind('./static'); //bind a directory to the app
cs.hybrid('./templates', hybrid, './static'); //read templates -> render templates -> output to static directory
cs.listen(7777); //listen on a lucky port number