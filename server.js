var cs = require('./coffeeshop.js'),
    dynamic = require('./dynamic.js'),
    hybrid = require('./hybrid.js');
    
cs.set('message', 'Hello World!');
cs.bind(dynamic);
cs.bind('./static');
cs.hybrid('./templates', hybrid, './static');
cs.listen(7777);