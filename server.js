var cs = require('./coffeeshop.js'),
    dynamic = require('./dynamic.js');
    
cs.set('message', 'Hello World!');
cs.bind(dynamic);
cs.bind('./static');
cs.listen(7777);