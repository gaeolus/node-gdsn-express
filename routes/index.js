var log  = require('../lib/Logger')('routes', {debug: true})

exports.getSnoopHandler = function (count) {
  count = count || 0
  return function(req, res, next) {
    count++
    res.cookie('test_response_cookie', 'some cookie data, count ' + count)
    var session = req.session || {}
    session.count = count
    session.timestamp = Date.now()
    res.contentType('text/html')
    res.render('snoop', {
      title: "Node HTTP Snoop",
      req: req,
      res: res
    })
  }
}
