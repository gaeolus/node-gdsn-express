var request        = require('request')

module.exports = function (config) {

  //var _              = require('underscore')
  //var async          = require('async')

  var log            = require('../lib/Logger')('rt_gdsnVld', config)
  var msg_archive_db = require('../lib/db/msg_archive.js')(config)

  var api = {}

  api.lookup_and_validate = function(req, res, next) {
    var url = config.url_gdsn_api + '/xmlvalidation'
    log.info('dp-xsd target url: ' + url)
    if (!url) return next('post to GDSN validate is not enabled, please set url_gdsn_api if needed')

    var start = Date.now()
    var msg_id = req.params.msg_id
    var sender = req.params.sender
    if (msg_id) { // fetch existing msg xml and submit to dp
      log.debug('lookup_and_validate will use existing message with id ' + msg_id)
      msg_archive_db.findMessage(sender, msg_id, function (err, db_msg_info) {
        if (err) return next(err)
        if (db_msg_info.length > 1) return next(Error('found multiple messages with id ' + msg_id))
        log.debug('found message for msg_id ' + msg_id)
        var xml = db_msg_info[0].xml
        if (!xml) return next(new Error('msg and xml not found for msg_id ' + msg_id))
        log.info('lookup_and_validate xml length from msg archive lookup: ' + xml.length)
        log.info('lookup_and_validate xml archive lookup (db) took ' + (Date.now() - start) + ' ms')
        do_validation_post(log, url, xml, function(err, post_response) {
          if (err) return next(err)
          res.end(post_response)
          if (!res.finished) res.end(post_response)
          log.info('lookup_and_validate response took ' + (Date.now() - start) + ' ms')
        })
      })
    }
    else {
      if (!res.finished) res.end('msg_id param is required')
    }
  }

  return api
}
    
function do_validation_post(log, url, xml, cb) {
  url += '?bus_vld=true'
  var post_options = {
    url: url
    , auth: {
        'user': 'admin'
        , 'pass': 'devadmin'
        , 'sendImmediately': true
      }
    , body: xml
  }
  try {

    var start = Date.now()
    request.post(post_options, function (err, response, body) {
      log.info('do_validation_post to GDSN Server took ' + (Date.now() - start) + ' ms')
      if (err) return cb(err)
      cb(null, body)
    })
  }
  catch (err) {
    cb(err)
  }
}
