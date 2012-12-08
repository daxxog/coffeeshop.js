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
        fs = require('fs');
        
    var cs = {};
        cs.express = express;
        cs.nodestatic = nodestatic;
        cs.async = async;
        
    var app = express(),
        server = new(nodestatic.Server)('./static');
        
        cs.app = app;
    
    cs.bind = function(dynamic, data) {
        if(typeof dynamic == 'object') {
            dynamic.bind(app, express, data);
        } else if(typeof dynamic == 'string') {
            var _server = new(nodestatic.Server)(dynamic);
            
            app.get('*', function(req, res) {
                req.addListener('end', function () {
                    _server.serve(req, res);
                });
            });
        } else {
            app.get('*', function(req, res) {
                req.addListener('end', function () {
                    server.serve(req, res);
                });
            });
        }
    };
    
    cs.listen = function(port, hostname, backlog, callback) {
        app.listen(port, hostname, backlog, callback);
    };
    
    cs.set = function(name, value) {
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
                        walk(file, function(err, res) {
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
    
    async.whilst(
        function() { //infinite loop
            return true;
        },
        function(callback) {
            var _callback = callback; //localize callback
            
            if(cs.hybridchain.length > 0) { //is the chain NOT empty?
                cs.hybridchain.forEach(function(v, i, a) { //loop the chain
                    setTimeout(function() { //parallel execution
                        v.hybrid.fresh(function() { //check if we have fresh content
                            cs.walk(v.templatedir, function(err, struct) { //walk the dir
                                var _v = v; //localize v
                                var _struct = struct; //localize struct
                                
                                for(var i = 0, len = struct.length; i < len; i++) { //each file in the dir
                                    var _i = i; //localize i
                                    
                                    fs.readFile(struct[i], 'utf-8', //read the template file
                                        function(err, data) {
                                            if(!err) {
                                                _v.hybrid.render(_struct[_i], data, function(err, data) { //render the template
                                                    if(!err) {
                                                        var writeTo = _struct[_i].replace(_v.templatedir, _v.staticdir);
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
                                                });
                                            } else {
                                                console.error("cs.hybrid: error reading file "+struct[i]);
                                            }
                                        }
                                    );
                                }
                                
                                if(err) {
                                    console.error("cs.hybrid: error reading dir "+v.templatedir);
                                }
                            });
                        } , function() { //else; nothing new
                            setTimeout(_callback, app.get('hybrid-timer')); //try again later
                        });
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