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
        Cluster = require('cluster2'),
        async = require('async'),
        redis = require('redis'),
        cookie  = require('cookie'),
        fs = require('fs'),
        events = require('events'),
        path = require('path');
        
    var cs = {};
        cs.express = express,
        cs.async = async;
        
    var app = express(),
        http = require('http').createServer(app),
        io = require('socket.io').listen(http),
        client = redis.createClient(),
        RedisStore = require('connect-redis')(express);
        
        cs.app = app;
        cs.RedisStore = RedisStore;
    
    app.use(express.compress());
    
    app.reload = cs.load = function(what, cb) { //generic loader / reloader function for caches and stuff
        if(typeof cb != 'function') {
            cb = function() {}; //blank function
        }
        
        switch(what) {
            case '404':
                fs.readFile(cs.four_o_four, function(err, data) {
                    cs.four_o_four_data = data;
                    cb(err);
                });
              break;
            default: 
              break;
        }
    };
    
    cs.ee = app.ee = new events.EventEmitter(); //create a global EventEmitter
    
    cs._mwstack = {}; //middleware stack object
    app.mwstack = cs.stack = function(name, mw) { //stack some middleware or return a stacked middleware
        if(typeof mw == 'function') { //if middleware is a function
            if(typeof cs._mwstack[name] == 'undefined') { //if we need to a place to store this middleware
                cs._mwstack[name] = []; //make a new stack
            }
            
            cs._mwstack[name].push(mw); //push the middleware onto the stack
        } else if(typeof cs._mwstack[name] == 'object' && cs._mwstack[name] instanceof Array) { //if the stack is an Array 
            return function(req, res, next) { //return a function that runs a stack of middleware
                var _asyncme = []; //stack that holds async functions
                cs._mwstack[name].forEach(function(v, i, a) {
                    _asyncme.push(function(cb) { //convert middleware to an async function and push onto the stack
                        v(req, res, function(err) {
                            cb(err);
                        });
                    });
                });
                
                async.series(_asyncme, function(err) { //run stack in a series
                    if(err) {
                        cs.error(err, 'Error in middleware stack!');
                    } else if(typeof next == 'function') { //if we can execute next
                        next(); //do next if the series finished without errors
                    }
                });
            };
        }
    };
    
    cs._error = function(err, msg) { //default error handler, change using cs.error or app.error
        console.error([err, msg]);
    };
    app.error = cs.error = function(err, msg) { //bind a function for error handling or call the error handler
        if(typeof err == 'function') { //if we are changing the error handler
            cs._error = err; //bind the new error handler
        } else if(err) { //if we have an error
            cs._error(err, msg); //call the error handler
        }
        
        return !err; //return true if err isn't undefined, null, false, "", or 0
    };
    
    cs._sockAuth = function(obj, setID, accept) { //basic defualt unsecure authentication
        setID((new Date()).getTime().toString()); //use the current time as the user ID
        accept(null, true); //accept the socket
    };
    app.sockAuth = cs.sockAuth = function(auth, accept, setID) { //_socketAuth function binding
        if(typeof auth == 'function') {
            cs._sockAuth = auth;
            cs.sock(); //setup the socket auth
        } else {
            cs._sockAuth(auth, setID, accept);
        }
    };
    
    app.fakeIO = cs.fakeIO = function(_id) { //create a fake io object for id
        return {
            "emit": function(id, data) { // basic io.emit emulation
                client.publish('_csse_'+_id, JSON.stringify({ //publish the data using redis Pub/Sub
                    "id": id,
                    "data": data
                }), function(err, data) { //check for errors
                    cs.error(err, 'Redis error while sending socket emit.');
                });
            }
        };
    };
    
    /*cs._sockInterval = 100; //default socket update interval
    app.sockInterval = cs.sockInterval = function(iv) { //set or get the socket update interval
        if(typeof iv == 'number') {
            return cs._sockInterval = iv;
        } else {
            return cs._sockInterval;
        }
    };*/
    
    cs._sock = false; //flag that tells if we have set up the socket auth
    cs.sock = function(interval) { //uses cookieParse() and session() with RedisStore
        if(cs._sock === false) { //have we not setup the socket auth?
            cs._sock = true; //say we set it up
            if(typeof interval == 'number') { //if we are setting the interval
                cs.sockInterval = interval; //set it
            }
            if(typeof app.secret == 'undefined') { //if we do not have app.secret
                app.secret = 'secret'; //use a default
            }
            
            app.use(express.cookieParser());
            app.use(express.session({ //redis based sessions
                store: new RedisStore({
                    "client": client.spawnClient('store'),
                    "ttl": app.get('REDIS_TTL')
                }),
                secret: function() {
                    return app.secret;
                }()
            }));
            
            var parseSessID = function(id) { //private function for parsing session IDs into what REDIS stores them as
                var _id = id.toString().split('.');
                return _id[0].replace('s:', 'sess:');
            };
            
            io.set('authorization', function(data, accept) { //socket authorization
                if(data.headers.cookie) { //if we have a cookie
                    data.cookie = cookie.parse(data.headers.cookie); //parse the cookie
                    data.sessionID = parseSessID(data.cookie['connect.sid']); //parse the sessionID
                    
                    client.get(data.sessionID, function(err, _data) { //grab the session from redis
                        if(cs.error(err, 'Redis error while doing socket authorization.')) { //check for errors
                            var obj = JSON.parse(_data); //parse the redis response into an object
                            
                            cs.sockAuth(obj, accept, function(id) { //setId
                                data.userID = id; //set the userID in the socket
                            });
                        } else {
                            accept('Redis error while doing socket authorization.', false); //check for errors
                        }
                    });
                } else {
                    accept('No cookie transmitted.', false); //check for errors
                }
            });
            
            io.sockets.on('connection', function(socket) { //when a user connects to this server (after authenticating)
                var id = socket.handshake.userID; //grab the userID
                
                var c = client.subscribe('_csse_'+id, function(data) {
                    if(data !== null) { //if we have data that is not null
                        var _data = JSON.parse(data); //parse the data
                        socket.emit(_data.id, _data.data); //do a socket emit with the parsed data
                    }
                });
                
                /*var socketLoop = setInterval(function() { //create an async loop to pop stuff from redis
                    client.lpop('_csse_'+id, function(err, data) { //pop the emit data for our userID
                        if(cs.error(err, 'Redis error while receiving socket emit.')) { //check for errors
                            if(data !== null) { //if we have data that is not null
                                var _data = JSON.parse(data); //parse the data
                                socket.emit(_data.id, _data.data); //do a socket emit with the parsed data
                            }
                        }
                    });
                }, cs.sockInterval); //set the interval*/

                socket.on('disconnect', function() { //when the user disconnect from this server
                    c.quit(); //kill the redis client
                    //clearInterval(socketLoop); //destroy the loop that is popping stuff from redis
                });
            });
        }
    };
    
    cs.grab = function(what, pass) { //parser function for the pass array
        switch(what) {
            case 'app':
                return pass[0];
            case 'express':
                return pass[1];
            case 'io':
                return pass[2];
            case 'client':
                return pass[3];
            case 'cb': 
                return pass[4];
            case 'store':
                return pass[5];
        }
    };
    
    cs._init = []; //init binding functions stack
    cs._bind = []; //binding functions stack
    cs.bind = function(mixed, data) { //bind a static directory or dynamic server to the app
        if(typeof mixed == 'object') { //if we are binding a dynamic server
            cs._bind.push(function() { //push an action to do later
                mixed.bind([app, express, io, client, null, RedisStore], cs.grab, data); //bind the dynamic server
            });
        } else if(typeof mixed == 'function') { //if we are binding an init function
            cs._init.push(function(cb) { //push an action to do later
                mixed([app, express, io, client, cb, null], cs.grab, data);
            });
        } else if(typeof mixed == 'string') { //if we are binding a static directory
            cs._bind.push(function() { //push an action to do later
                var continue_bind = true; //do we want to continue the bind?
            
                if(typeof data == 'string') { //if data is a string
                    switch(data) { //parse the data string
                        case 'npm': //if we are binding to a static local npm module
                            mixed = path.join('./node_modules', mixed, './cs_serve'); //point to the cs_serve directory
                          break;
                        case '404': //if we are binding a 404 page
                            cs.four_o_four = mixed; //bind the 404 page
                            continue_bind = false; //don't continue the bind operation
                          break;
                        default:
                          break;
                    }
                }
                
                if(continue_bind === true) {
                    cs.stack('static', express.static(mixed));
                }
            });
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
    
    cs.mode("development", function() { //default development mode    
        app.set('hybrid-timer', 2000); //two second timer for hybrid renders
    });

    cs.cluster = false;

    cs.listen = function(port, hostname) {
        var _after_init = function() {
            cs._bind.forEach(function(v, i, a) { //run all the bind functions
                v();
            });
            delete cs._bind; //remove all bind functions after we are done running them
            
            app.use(cs.stack('static'));
            
            if(typeof cs.four_o_four == 'string') {
                cs.load('404', function(err) {
                    if(!err) {
                        app.use(function(req, res) {
                            res.type(path.extname(cs.four_o_four)); //send the headers based on the file name
                            res.send(404, cs.four_o_four_data); //send a 404 with the data
                        });
                    } else {
                        cs.error(err, 'Error sending 404!');
                        res.send(500); //internal server error
                    }
                });
            }
            
            if(cs.cluster === true) { //if we are using a cluster
                var c = new Cluster({ //use it!
                    "port": port,
                    "host": hostname,
                    cluster: true
                });
                c.listen(function(cb) { //and listen with it
                    cb(http);
                });
            } else {
                http.listen(port, hostname); //pass arguments to http.listen
            }
        };
        
        if(cs._init.length === 0) {
            _after_init();
        } else {
            async.series(cs._init, function(err, results) {
                cs.error(err, 'Error in init function'); //handle any errors
                _after_init(); //run whatever we need to run when all the init is done
                delete cs._init; //remove all init functions after we are done running them
            });
        }
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
                                                                cs.error(err, 'cs.hybrid: error writing file '+writeTo);
                                                            }
                                                        });
                                                    } else {
                                                        cs.error(err, 'cs.hybrid: error rendering file '+struct[i]);
                                                    }
                                                }, _writeTo, app, express);
                                            } else {
                                                cs.error(err, 'cs.hybrid: error reading file '+struct[i])
                                            }
                                        });
                                    })(v, i, struct, _callback);
                                }
                                
                                if(err) {
                                    cs.error(err, 'cs.hybrid: error reading dir '+v.templatedir);
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
            cs.error(err, 'cs.hybrid: ');
        }
    );

    return cs;
}));