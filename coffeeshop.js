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
        nodestatic = require('node-static');
        
    var cs = {};
        cs.express = express;
        cs.nodestatic = nodestatic;
        
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

    return cs;
}));