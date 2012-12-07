/* coffeeshop.js / hybrid.js
 * example of a hybrid server (dynamic and static)
 * (c) 2012 David (daXXog) Volm ><> + + + <><
 * Released under Apache License, Version 2.0:
 * http://www.apache.org/licenses/LICENSE-2.0.html  
 */

/* "test" db collection "Hybrid" looks like this
{
    "ts": 1347627537,
    "fn": "./templates/index.html",
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
        mustache = require('mustache');
    
    //mongodb connection function
    var mongo_connect = function() {
        return new mongo.Server('127.0.0.1', 27017, {
            native_parser: true, 
        });
    },  mongo_options = { //mongodb database options
        w: 1
    };
    
    var stamps = {}; //last timestamps from database
    
    var hybrid = {
        fresh: function(cbtrue, cbfalse) { //two callbacks one if fresh, two if not
            var client = new mongo.Db('test', mongo_connect(), mongo_options); //setup the db
            client.open(function (err, client) { //connect to the db
                (new mongo.Collection(client, 'Hybrid')).find({}).toArray(function(err, docs) { //find EVERYTHING in the Hybrid collection
                    var needfresh = false; //flag that tells which callback we are calling
                    
                    docs.forEach(function(v, i, a) { //loop through all the documents in the collection
                        if(typeof stamps[v.fn] == 'undefined') { //if last timestamp for a document is undefined
                            needfresh = true; //we need to render a fresh template
                        } else if(stamps[v.fn] != v.ts) { //if the last timestamp for a document doesn't match the one in the db
                            needfresh = true;  //we need to render a fresh template
                        }
                    });
                    
                    if(needfresh) {
                        setTimeout(cbtrue, 1); //we need fresh template: first callback
                    } else {
                        setTimeout(cbfalse, 1); //we should try checking again later: second callback
                    }
                    
                    client.close(); //close the db
                });
            });
        },
        render: function(fn, data, cb) { //file name, file data, callback to call when done rendering
            var client = new mongo.Db('test', mongo_connect(), mongo_options); //setup the db
            var _fn = fn //localize fn
            var _data = data; //localize data
            
            client.open(function (err, client) { //connect to the db
                (new mongo.Collection(client, 'Hybrid')).find({fn: _fn}).toArray(function(err, docs) { //find the file name in the db
                    var doc = docs[0]; //load up the first thing we see
                    
                    stamps[doc.fn] = doc.ts; //update the local timestamp
                    cb(err, mustache.render(_data, doc)); //render and tell the callback about it
                    client.close(); //close the db
                });
            });
        },
    };
    
    return hybrid;
}));