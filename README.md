[coffeeshop.js](https://github.com/daxxog/coffeeshop.js)
=============
Loosely coupled full stack JavaScript. For realz.

daXXog's DEBUG BRANCH
------------

Install
-------
```bash
npm install https://github.com/daxxog/coffeeshop.js/tarball/debug
```
examples
```bash
#hybrid.mongodb.mustache.uglify-js.less.js
wget https://raw.github.com/daxxog/coffeeshop.js/master/hybrid.mongodb.mustache.uglify-js.less.js

#dynamic.js
wget https://raw.github.com/daxxog/coffeeshop.js/master/dynamic.js

#make dirs for server.js example
mkdir templates
mkdir static

#download templates
cd templates
wget https://raw.github.com/daxxog/coffeeshop.js/master/templates/index.html
wget https://raw.github.com/daxxog/coffeeshop.js/master/templates/client.js
wget https://raw.github.com/daxxog/coffeeshop.js/master/templates/style.less
cd ..

#get server.js npm dependencies
npm install mongodb mustache uglify-js less https://github.com/daxxog/cash.js/tarball/master

#server.js requires dynamic.js, hybrid.mongodb.mustache.js, templates dir, static dir
wget https://raw.github.com/daxxog/coffeeshop.js/master/server.js
```

Current Features
----------------
* Backend: [node.js](https://github.com/joyent/node)
* Framework: [express](https://github.com/visionmedia/express)
* Static server: [node-static](https://github.com/cloudhead/node-static)
  * Multiple servers supported
  * Bind a npm to serve statically: [example npm package](https://github.com/daxxog/cash.js)
* Real time socket stuff: [Socket.IO](https://github.com/LearnBoost/socket.io)
* Loosely coupled hybrid rendering, feel free to create your own hybrid render
  * [hybrid.mongodb.mustache.uglify-js.less.js](https://github.com/daxxog/coffeeshop.js/blob/master/hybrid.mongodb.mustache.uglify-js.less.js) : [mongoDB](https://github.com/mongodb/node-mongodb-native) / [mustache.js](https://github.com/janl/mustache.js/) / [UglifyJS](https://github.com/mishoo/UglifyJS2) / [less](https://github.com/cloudhead/less.js)

TODO
----
* Authentication: passport.js