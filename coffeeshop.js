/* coffeeshop.js
 * Loosely coupled full stack JavaScript. For realz.
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
}(this, function () {
    var express = require('express'),
        nodestatic = require('node-static'),
        async = require('async'),
        fs = require('fs'),
        path = require('path');
        
    var cs = {};
        cs.express = express;
        cs.nodestatic = nodestatic;
        cs.async = async;
        
    var app = express(),
        http = require('http').createServer(app),
        io = require('socket.io').listen(http);
        
        cs.app = app;
    
    cs._static_stack = []; //stack that holds (req, res) functions for static servers
    cs._static_works = {}; //object that caches whether a static server can succesfully respond to a url. This way requests to servers that will respond with an error are never made
    cs._static_err = {}; //object that keeps track of what static servers responded with what error code on what file. This is so two static servers don't both send an error
    cs._static_fnd_err = {}; //object that keeps track of if we found an error type on a url. This is for the same reason as above.
    cs.bind = function(mixed, data) { //bind a static directory or dynamic server to the app
        if(typeof mixed == 'object') { //if we are binding a dynamic server
            mixed.bind(app, express, io, data); //bind the dynamic server
        } else if(typeof mixed == 'string') { //if we are binding a static directory
            if(typeof data == 'string') { //if data is a string
                switch(data) { //parse the data string
                    case 'npm': //if we are binding to a static local npm module
                        mixed = path.join('./node_modules', mixed, './cs_serve'); //point to the cs_serve directory
                      break;
                    
                    default:
                      break;
                }
            }
            
            var _server = new(nodestatic.Server)(mixed); //create a static server from the directory
            
            var _id = cs._static_stack.push(function(req, res) { //push a (req, res) function onto the stack and get the _id
                req.addListener('end', function() { //do something once we have the request data
                    if(typeof cs._static_works[req.url] == 'undefined' || cs._static_works[req.url] == _id) { //if we don't know what static server works for this url or we do know and this server is it
                        _server.serve(req, res, function (err, result) { //serve it up
                            if(err) { //if we need to handle an error
                            
                                /* START SETUP VARS */
                                if(typeof cs._static_err[err.status] == 'undefined') {
                                    cs._static_err[err.status] = {};
                                }
                                
                                if(typeof cs._static_err[err.status][req.url] == 'undefined') {
                                    cs._static_err[err.status][req.url] = [];
                                }
                                
                                if(typeof cs._static_fnd_err[err.status] == 'undefined') {
                                    cs._static_fnd_err[err.status] = {}
                                }
                                
                                if(typeof cs._static_err[err.status][req.url] == 'undefined') {
                                    cs._static_err[err.status][req.url] = false;
                                }
                                /* END SETUP VARS */
                                
                                if(cs._static_err[err.status][req.url].length === (cs._static_stack.length - 1)) { //if every other server got the same error
                                    if(cs._static_fnd_err[err.status][req.url] === false || _id === (cs._static_stack.length - 1)) { //if we have't found this error on this url before or if this is the last server on the stack
                                        cs._static_fnd_err[err.status][req.url] = true; //tell other servers we found and handled this error on this url
                                        res.writeHead(err.status, err.headers); //output HTTP error
                                        res.end(); //end of response
                                    }
                                } else { //another server might be able to serve this url
                                    if(cs._static_err[err.status][req.url].indexOf(_id) === -1) { //if we have't reported that we got this error before
                                        cs._static_err[err.status][req.url].push(_id); //report that we got the error by pushing it onto a stack
                                    }
                                }
                            } else { //we served the file successfully
                                cs._static_works[req.url] = _id; //tell the other servers this server should handle all future requests to this url
                            }
                        });
                    }
                });
            }) - 1;
        } else { //blank first argument
            cs.bind('./static'); //default static directory
        }
    };
    
    cs.modes = {}; //object that holds functions that are intended set up and change to different modes
    cs.mode = function(mode, set) { //bind a mode to coffeeshop or change the mode
        if(typeof set == 'function') { //if we are setting a mode
            cs.modes[mode] = set; //bind to modes
        } else {
            (typeof cs.modes[mode] == 'undefined') ? console.error("cs.mode: invalid mode!") : cs.modes[mode](cs); //run the mode
        }
    };
    
    cs.mode("production", function() { //default production mode
        //socket.io production settings https://github.com/LearnBoost/Socket.IO/wiki/Configuring-Socket.IO
        io.enable('browser client minification');  // send minified client
        io.enable('browser client etag');          // apply etag caching logic based on version number
        io.enable('browser client gzip');          // gzip the file
        io.set('log level', 1);                    // reduce logging
        io.set('transports', [                     // enable all transports (optional if you want flashsocket)
            'websocket'
          , 'flashsocket'
          , 'htmlfile'
          , 'xhr-polling'
          , 'jsonp-polling'
        ]);
        
        app.set('hybrid-timer', 30000); //thirty second timer for hybrid renders
    });
    
    cs.listen = function(port, hostname, backlog, callback) {
        if(cs._static_stack !== 0) { //if the static stack isn't empty
            app.get('*', function(req, res) { //static requests
                cs._static_stack.forEach(function(v, i, a) { //for every static server
                    v(req, res); //try to handle the request
                });
            });
        }
        
        http.listen(port, hostname, backlog, callback); //pass arguments to http.listen
    };
    
    cs.set = function(name, value) { //wrapper for app.set(name, value)
        app.set(name, value);
    };
    
    //walk() async function from: http://stackoverflow.com/a/5827895
    cs.walk = function(dir, done) {
        var results = [];
        fs.readdir(dir, function(err, list) {
            if (err) return done(err);
            var pending = list.length;
            if (!pending) return done(null, results);
            list.forEach(function(file) {
                file = dir + '/' + file;
                fs.stat(file, function(err, stat) {
                    if (stat && stat.isDirectory()) {
                        cs.walk(file, function(err, res) {
                            results = results.concat(res);
                            if (!--pending) done(null, results);
                        });
                    }
                    else {
                        results.push(file);
                        if (!--pending) done(null, results);
                    }
                });
            });
        });
    };
    
    app.set('hybrid-timer', 2000); //default hybrid-timer setting
    cs.hybridchain = [];
    cs.hybrid = function(templatedir, hybrid, staticdir) {
        cs.hybridchain.push({
            "templatedir": templatedir,
            "hybrid": hybrid,
            "staticdir": staticdir
        });
    };
    
    cs.once = app.once = function(fu) { //Returns a function that will run once and only once.
        var extfu = {};

        extfu = function(fu) { //object that runs a function that returns a function! #codeception
            return (function(extfu) {
                return function() {
                    if(!extfu.ran) { //if the function hasn't run
                        extfu.ran = true; //we ran it
                        return fu(); //run function and return the result
                    }
                };
            })(this);
        };

        extfu.prototype.ran = false; //we didn't run it yet

        return new extfu(fu); //create some #codeception
    }
    
    async.whilst(
        function() { //infinite loop
            return true;
        },
        function(callback) {
            var _callback = cs.once(callback); //localize callback and make it only callable once
            
            if(cs.hybridchain.length > 0) { //is the chain NOT empty?
                cs.hybridchain.forEach(function(v, i, a) { //loop the chain
                    setTimeout(function() { //parallel execution
                        v.hybrid.fresh(function() { //check if we have fresh content
                            cs.walk(v.templatedir, function(err, struct) { //walk the dir
                                for(var i = 0, len = struct.length; i < len; i++) { //each file in the dir
                                    (function(v, i, struct, callback) { //closure so the loop works properly
                                        fs.readFile(struct[i], 'utf-8', function(err, data) { //read the template file
                                            if(!err) {
                                                var _writeTo = struct[i].replace(v.templatedir, v.staticdir);
                                                v.hybrid.render(struct[i], data, function(err, data, to) { //render the template
                                                    if(!err) {
                                                        var writeTo = (typeof to == 'undefined') ? _writeTo : to; //see if we need to change writeTo
                                                        fs.writeFile(writeTo, data, 'utf-8', function(err) { //save the rendered template
                                                            if(!err) {
                                                                setTimeout(_callback, app.get('hybrid-timer')); //check for changes later
                                                            } else {
                                                                console.error("cs.hybrid: error writing file "+writeTo);
                                                            }
                                                        });
                                                    } else {
                                                        console.error(err);
                                                        console.error("cs.hybrid: error rendering file "+struct[i]);
                                                    }
                                                }, _writeTo, app, express);
                                            } else {
                                                console.error("cs.hybrid: error reading file "+struct[i]);
                                            }
                                        });
                                    })(v, i, struct, _callback);
                                }
                                
                                if(err) {
                                    console.error("cs.hybrid: error reading dir "+v.templatedir);
                                }
                            });
                        } , function() { //else; nothing new
                            setTimeout(_callback, app.get('hybrid-timer')); //try again later
                        }, app, express);
                    }, 1);
                });
            } else { //chain empty
                setTimeout(callback, app.get('hybrid-timer')); //try again later
            }
        },
        function(err) {
            console.error('cs.hybrid: ');
            console.error(err);
        }
    );

    return cs;
}));