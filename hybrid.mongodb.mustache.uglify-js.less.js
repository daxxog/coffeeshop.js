/* coffeeshop.js / hybrid.js
 * example of a hybrid server (dynamic and static)
 * (c) 2012 David (daXXog) Volm ><> + + + <><
 * Released under Apache License, Version 2.0:
 * http://www.apache.org/licenses/LICENSE-2.0.html  
 */

/* "test" db collection "Hybrid" looks like this
{
    "ts": 1347627537,
    "name": "./templates/index.html",
    "hello": "world",
    "_id": new ObjectID("50c00a32dbb8a5e35a000001")
}
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
    var mongo = require('mongodb'),
        mustache = require('mustache'),
        less = require('less'),
        UglifyJS = require("uglify-js"),
        fs = require('fs'),
        path = require('path');
    
    //mongodb connection function
    var mongo_connect = function() {
        return new mongo.Server('127.0.0.1', 27017, {
            native_parser: true, 
        });
    },  mongo_options = { //mongodb database options
        w: 1
    };
    
    var stamps = {}; //last timestamps from database
    var stamps_local = {}; //last timestamps on local files
    var local_files = []; //array of the local files
    
    var once = function(fu) { //Returns a function that will run once and only once.
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
    };
    
    var hybrid = {
        fresh: function(_cbtrue, _cbfalse) { //two callbacks one if fresh, two if not
            var cbtrue = once(_cbtrue),
                cbfalse = once(_cbfalse);
            var client = new mongo.Db('test', mongo_connect(), mongo_options); //setup the db
            client.open(function (err, client) { //connect to the db
                (new mongo.Collection(client, 'Hybrid')).find({}).toArray(function(err, docs) { //find EVERYTHING in the Hybrid collection
                    var dbupdate = false;
                    
                    docs.forEach(function(v, i, a) { //loop through all the documents in the collection
                        if(typeof v.ts == 'undefined') {
                            //this document doesn't have a timestamp
                        } else if(typeof stamps[v.name] == 'undefined') { //if last timestamp for a document is undefined
                            setTimeout(cbtrue, 1); //we need to render a fresh template
                            dbupdate = true;
                        } else if(stamps[v.name] !== v.ts.toString()) { //if the last timestamp for a document doesn't match the one in the db
                            setTimeout(cbtrue, 1); //we need to render a fresh template
                            dbupdate = true;
                        }
                    });
                    
                    client.close(); //close the db
                    
                    if(!dbupdate) {
                        if(local_files.length<=0) {
                            setTimeout(cbtrue, 1); //we need to render a fresh template
                        } else {
                            local_files.forEach(function(v, i, a) {
                                fs.exists(v, function (exists) { //if the local file exists
                                    if(exists) {
                                        fs.stat(v, function(err, stats) { //check to see if a local file was updated
                                            if(typeof stamps_local[v] == 'undefined') { //check if we have saved a local timestamp
                                                setTimeout(cbtrue, 1); //we need to render a fresh template
                                            } else if(stamps_local[v] != stats.mtime.toString()) { //check if our local timestamp matches the current one
                                                setTimeout(cbtrue, 1); //we need to render a fresh template
                                            } else {
                                                setTimeout(cbfalse, 1); //try again later
                                            }
                                        });
                                    } else {
                                        setTimeout(cbfalse, 1); //try again later
                                    }
                                });
                            });
                        }
                    }
                });
            });
        },
        render: function(fn, data, cb, to) { //file name, file data, callback to call when done rendering
            if(local_files.indexOf(fn)==-1) { //if the local files list doesn't have this file
                local_files.push(fn); //add the current file to the local files list
            }
            
            fs.stat(fn, function(err, stats) {
                stamps_local[fn] = stats.mtime.toString(); //update the last modified time for the client js
            });
            
            switch(path.extname(fn)) {
                case '.js': 
                    cb(null, UglifyJS.minify(data, { //minify the js
                        fromString: true
                    }).code, to.replace('.js', '.min.js'));
                    
                    cb(null, data); //return the normal version too
                  break;
                case '.less': 
                    (new less.Parser()).parse(data, function(err, tree) { //render the css template (minified)
                        cb(err, tree.toCSS({
                            yuicompress: true
                        }), to.replace('.less', '.min.css'));
                    });
                    
                    less.render(data, function(err, css) {  //render the css template
                        cb(err, css, to.replace('.less', '.css'));
                    });
                  break;
                default:
                    var client = new mongo.Db('test', mongo_connect(), mongo_options); //setup the db
                    var _fn = fn; //localize fn
                    var _data = data; //localize data
                    
                    client.open(function (err, client) { //connect to the db
                        (new mongo.Collection(client, 'Hybrid')).find({name: _fn}).toArray(function(err, docs) { //find the file name in the db
                            var doc = docs[0]; //load up the first thing we see
                            
                            if(typeof doc == 'undefined') { //no matches found in db
                                cb(err, _data); //just return the data how it was
                            } else {
                                if(typeof doc.ts != 'undefined') {
                                    stamps[doc.name] = doc.ts.toString(); //update the local timestamp
                                }
                                
                                cb(err, mustache.render(_data, doc)); //render and tell the callback about it
                            }
                            client.close(); //close the db
                        });
                    });
                  break;
            }
        },
    };
    
    return hybrid;
}));