var async   = require('async')
var request = require('request')

module.exports = function (config) {

  var log            = require('../lib/Logger')('rt_publish', {debug: true})
  var utils          = require('../lib/utils.js')(config)
  var db_msg_archive = require('../lib/db/msg_archive.js')(config)
  var process_msg    = require('../lib/process_msg.js')(config)

  var api = {}

  api.publish = function (req, res, next) {
    log.debug('>>>>>>>>>>>>>>>>>>>> gdsn publish  handler called')

    var provider = req.params.provider
    if (!provider) {
      return next(Error('provider gln is required, e.g. /publish/1100001011292'))
    }
    log.debug('post publish path provoider: ' + provider)

    var content = ''
    req.setEncoding('utf8')
    req.on('data', function (chunk) {
      log.debug('mds_post_chunk length: ' + (chunk && chunk.length))
      content += chunk
      if (content.length > 10 * 1024 * 1024 && !res.finished) res.end('content too big - larger than 10 MB')
    })

    req.on('end', function () {

      log.info('Received content of length ' + (content && content.length || '0'))

      console.log('req.body:')
      console.log(content)
      var body = ''
      body = JSON.parse(content)
      console.log('parsed:')
      console.dir(body)

      if (!body.gtin || body.gtin.length == 0 || !body.gln || body.gln.length == 0) {
        throw Error('at least 1 gtin and 1 gln are required')
      }
      // do async api calls:
      var tasks = []
      var errorCount = 0

      body.gtin.forEach(function (gtin) {
        body.gln.forEach(function (gln) {
          tasks.push(function (task_done) {

            log.debug('update pub data for gtin ' + gtin + ', pub to: ' + gln)
            var start_cip_api_call = Date.now()

            var form_data = {
                ds       : provider
              , dr       : gln
              , gtin     : gtin
              , tm       : '840'
              , tms      : ''
              , il       : body.load ? 'true' : ''
              , ts       : new Date()
            }
            //if (pub['delete']) form_data['delete'] = 'true'

            request.post({
              url          : config.url_gdsn_api + '/publish'
              , form: form_data
              , auth: {
                  user: 'admin'
                  , pass: 'devadmin'
                  , sendImmediately: true
              }
            },
            function (err, response, res_body) {
              log.info('cip api call took '
                + (Date.now() - start_cip_api_call)
                + ' ms with response: '
                + (response ? response.statusCode : 'NO_RESPONSE')
                + ', body: '
                + res_body)

              if (err) return task_done(err) // this will prevent construction of meaningful api response, short-circuit

              //if (response.statusCode != '200') return task_done(Error('bad status code ' + response.statusCode))


              var error = err || get_error_message(res_body, log)
              if (error) errorCount++

console.log('type of statusCode: ' + typeof response.statusCode)
              task_done(null, {
                //success   : !err && !error && response.statusCode == '200'
                success   : !err && !error && response.statusCode == '200'
                ,error    : error || ''
                ,gln      : gln
                ,gtin     : gtin
              })

            }) // end request.post
          }) // end tasks.push
        }) // end forEach gln
      }) // end forEach gtin

      async.parallel(tasks, function (err, results) {
        log.debug('parallel cip results count: ' + results && results.length)
        if (!res.finished) {
          res.json({
            results_count: (results ? results.length : 0)
            ,all_published: !errorCount
            ,error_count : errorCount
            ,provider    : provider
            ,results     : results || []
          })
          res.end()
          return
        }
      }, 10) // concurrency 10, end async.parallel
    }) // end req.on('end'
  }

  api.get_publication_list = function (req, res, next) {

    var provider = req.params.provider
    if (!provider) {
      return next(Error('provider gln is required, recipient is optional, e.g. publish/1100001011292 or publish/1100001011292/1100001011339'))
    }
    var subscriber = req.params.subscriber || ''
    if (!subscriber) {
      log.debug('get all pubs for provider ' + provider)
    }
    var start_get_pub_list = Date.now()
    log.debug('fetching pub data for provider ' + provider + ', subscriber ' + subscriber)

    request.get({
      url   : config.url_gdsn_api + '/publicationList?publisher=' + provider + '&publishToGln=' + subscriber // + '&ts=' + Date.now()
    },
    function (err, response, body) {

      if (res.finished) return next(Error('original response already finished'))

      if (err) return next(err)

      log.info('get publication list api call took '
        + (Date.now() - start_get_pub_list )
        + ' ms with response: '
        + (response ? response.statusCode : 'NO_RESPONSE')
        + ', body length: '
        + (body && body.length))

      if (response.statusCode >= 400) return next(Error('failed with status code ' + response.statusCode))

      var results = []
      try {
        JSON.parse(body).publications.forEach(function(pub) {
          results.push({
            provider  : pub.gln
            ,gtin     : pub.gtin
            ,recipient: pub.publishToGLN
            ,tm       : pub.tm
            ,tm_sub   : pub.tmSub
          })
        })
      }
      catch (e) {
        log.debug('json parse error: ' + e)
        console.dir(e)
        log.debug('json parse error source text: ' + body)
        console.dir(body)
        next(error)
      }

      res.json({publications: results})
      res.end()
      return
    }) // end request.get
  }// end get_publication_list

  return api
}

function get_error_message(body, log) {
  try {
    body = body.replace(/\(/g, '')
    var res_body = JSON.parse(body)
    console.log('error: ' + res_body.error)
    console.dir(res_body)
    return res_body.error ? JSON.stringify([res_body.error]) : ''
  }
  catch (e) {
    log.debug('json parse error: ' + e)
    log.debug('json parse error source text: ' + body)
    console.dir(body)
    return body
  }
  return ''
}