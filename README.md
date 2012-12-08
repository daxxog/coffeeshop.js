[coffeeshop.js](https://github.com/daxxog/coffeeshop.js)
=============
Loosely coupled full stack JavaScript. For realz.

Install
-------
```bash
npm install https://github.com/daxxog/coffeeshop.js/tarball/master
```
examples
```bash
#hybrid.mongodb.mustache.js
wget https://raw.github.com/daxxog/coffeeshop.js/master/hybrid.mongodb.mustache.js

#dynamic.js
wget https://raw.github.com/daxxog/coffeeshop.js/master/dynamic.js

#make dirs for server.js example
mkdir templates
mkdir static

#download template
cd templates
wget https://raw.github.com/daxxog/coffeeshop.js/master/templates/index.html
cd ..

#server.js requires dynamic.js, hybrid.mongodb.mustache.js, templates dir, static dir
wget https://raw.github.com/daxxog/coffeeshop.js/master/server.js
```

Current Features
----------------
* Backend: [node.js](https://github.com/joyent/node)
* Framework: [express](https://github.com/visionmedia/express)
* Static Server: [node-static](https://github.com/cloudhead/node-static)
* Loosely coupled hybrid rendering, feel free to create your own hybrid render
  * [hybrid.mongodb.mustache.js](https://github.com/daxxog/coffeeshop.js/blob/master/hybrid.mongodb.mustache.js) : [mongoDB](https://github.com/mongodb/node-mongodb-native) / [mustache.js](https://github.com/janl/mustache.js/)

TODO
----
* Authentication: passport.js