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
            
            app.get('*', function(req, res){
                req.addListener('end', function () {
                    _server.serve(req, res);
                });
            });
        } else {
            app.get('*', function(req, res){
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
            cs.hybridchain.forEach(function(v, i, a) {
                setTimeout(function() { //parallel execution
                    if(v.hybrid.fresh()) {
                        cs.walk(v.templatedir, function(err, struct) { //walk the dir
                            for(var i = 0, len = struct.length; i < len; i++) { //each file in the dir
                                fs.writeFileSync(
                                    struct[i].replace(v.templatedir, v.staticdir),
                                    v.hybrid.render(
                                        struct[i],
                                        fs.readFileSync(
                                            struct[i],
                                            'utf-8'
                                        )
                                    )
                                );
                            }
                            if(err) {
                                console.error("cs.hybrid: error reading dir "+v.templatedir);
                            }
                        });
                    }
                }, 1);
            });
            
            setTimeout(callback, 2000);
        },
        function(err) {
            console.error('cs.hybrid: ');
            console.error(err);
        }
    );

    return cs;
}));