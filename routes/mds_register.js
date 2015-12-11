module.exports = function (config) {

  var async   = require('async')
  var request = require('request')

  var log           = require('../lib/Logger')('rt_mdsreg', config)
  var outbox        = require('../lib/outbox.js')(config)
  var trade_item_db = require('../lib/db/trade_item.js')(config)
  var promises      = require('../lib/promises.js')(config)

  var api = {}

  api.register_existing_item = function (req, res, next) { // GET /:provider/:gtin/:tm[/:tm_sub|na]

    var start = Date.now()

    log.debug('>>>>>>>>>>>>>>>>>>>> gdsn register saved single item handler called at time ' + start)

    var item = {
        recipient : config.homeDataPoolGln
        , provider: req.params.provider
        , gtin    : req.params.gtin
        , tm      : req.params.tm || '840'
        , tm_sub  : req.params.tm_sub || 'na'
        , validate: true
    }

    validate_and_register_item(item, function (err, results) {

      log.debug('>>>>>>>>>>>>>>>>>>>> validate_register_item (' + (results ? results.length : '0') + ' results) took ' + (Date.now() - start) + ' ms')

      if (err) return next(err) // not expected as item errors will be wrapped in results
      if (!results || !results.length) return next(Error('no results'))

      var error_count = 0
      results.forEach(function (result) {
        log.info('register_items result: ' + result)
        if (result == null || !result.success) error_count++
      })
      var output = {
       result_count: (results && results.length) || '0'
       ,error_count: error_count
       ,provider: provider
       ,results: results
      }
      console.log('=============================================')
      console.dir(output)
      res.jsonp(output)
    }) // end validate_register_item call
  }

  api.register_existing_items = function (req, res, next) { // json post

    var start = Date.now()

    log.debug('>>>>>>>>>>>>>>>>>>>> gdsn register saved items handler called at time ' + start)

    var provider = req.params.provider
    if (!provider) {
        // validate gln
      return next(Error('provider gln is required'))
    }

    var content = ''
    req.setEncoding('utf8')
    req.on('data', function (chunk) {
      log.debug('mds_post_chunk length: ' + (chunk && chunk.length))
      content += chunk
      if (content.length > 10 * 1024 * 1024) res.end('content too big - larger than 10 MB')
    })

    req.on('end', function () {

      var req_body
      try {
        log.info('Received content of length ' + (content && content.length || '0'))
        console.log('request body:' + content)

        req_body = JSON.parse(content)
        console.log('parsed:')
        console.dir(req_body)

        req_body.items.forEach(function (item) {
          item.recipient = config.homeDataPoolGln
          item.provider = provider
          item.tm_sub = item.tm_sub || item.tmSub || 'na'
          item.validate = req_body.validate
        })
      }
      catch (err) {
        log.error('Error parsing request content: ' + content)
        log.error(err)
        req_body = { items: [], validate: false }
      }
      if (!req_body.items.length) return next(Error('no item definitions found in request'))

      validate_register_items(req_body.items, function (err, results) {

        log.debug('>>>>>>>>>>>>>>>>>>>> validate_register_items (' + (results ? results.length : '0') + ' results) took ' + (Date.now() - start) + ' ms')

        if (err) return next(err) // not expected as item errors will be wrapped in results
        if (!results || !results.length) return next(Error('no results'))

        var error_count = 0
        results.forEach(function (result) {
          log.info('register_items result: ' + result)
          if (result == null || !result.success) error_count++
        })
        var output = {
           result_count: (results && results.length) || '0'
           ,error_count: error_count
           ,provider: provider
           ,results: results
        }
        console.log('=============================================')
        console.dir(output)
        res.jsonp(output)
      }) // end validate_register_items call
    }) // end req.on('end')
  }

  // private worker functions:

  function validate_register_items(items, all_done) {
    var tasks = []
    items.forEach(function (item_query) {
      tasks.push(function (task_done) {
        validate_and_register_item(item_query, function (err, result) {
          if (err) return task_done(err)
          task_done(null, result) // result will wrap any errors
        })
      })
    })
    async.parallel(tasks, all_done, 5) // concurrency
  }

  function validate_and_register_item(query, done) {
    console.log('item query: ' + (query && query.gtin))

    trade_item_db.findTradeItemFromItem(query, function (err, item) {

      if (err) return done(null, format_result(err, null, null, query))

      if ((query.itemOwnerProductCode && query.itemOwnerProductCode != item.itemOwnerProductCode)
       || (query.vendorId             && query.vendorId             != item.vendorId)
       || (query.buyerId              && query.buyerId              != item.buyerId)
       || (query.portalChar           && query.portalChar           != item.portalChar)) {

          return done(null, format_result(Error('mds attributes do not match, no item found'), null, null, item))
      }

      // skip validation and just register:
      //if (query.validate == 'false') return register_item(item, done) // skip validation?
      if (query.validate != 'false') item.validate_bms = true // skip BMS validation?

      // validate, then register:
      validate_single_item(item, register_item, done)
    })
  } // end validate_and_register_item

  function validate_single_item(item, do_success, done) {
    log.debug('validate_single_item, gtin: ' + item.gtin)
    var start = Date.now()
    promises.item_hierarchy_cin_validate(item, function (err, result) {

      if (err) {
        return done(null, format_result(err, null, null, item, 'Validation')) // end of processing for each item
      }
      do_success(item, done)
    })
  } // end validate_single_item

  function register_item(item, done) {
    var form_data = {
        brandName                 : item.brand
      , classCategoryCode         : item.gpc
      , unitDescriptor            : item.unit_type
      , ts                        : new Date()
      , cmd                       : 'ADD'
      , ci_state: 'REGISTERED' // always, for now
    }
    if (item.cancelledDate)    form_data.canceledDate     = item.cancelledDate // iso string
    if (item.discontinuedDate) form_data.discontinuedDate = item.discontinuedDate // iso string

    form_data.brand             = form_data.brand             || 'generic'
    form_data.classCategoryCode = form_data.classCategoryCode || '99999999'
    form_data.unitDescriptor    = form_data.unitDescriptor    || 'CASE'

    var children = item.child_gtins && item.child_gtins.join(',')
    form_data.children = '[' + children + ']'

    log.debug('posting item data for gtin  ' + item.gtin)
    request.post({
      url   : config.url_gdsn_api + '/ci/' + item.provider + '/' + item.gtin + '/' + item.tm + '/' + item.tm_sub || 'na'
      , form: form_data
      , auth: {
          'user': 'admin'
          , 'pass': 'devadmin'
          , 'sendImmediately': true
        }
    }, function (err, response, res_body) {
      log.debug('post single item register dp result: ' + res_body)

      if (err || response.statusCode != 200) {
        return done(null, format_result(err, response, res_body, item, 'Registration')) // end of processing for each item
      }

      var send_rci = false
      var rci_cmd = ''

      try {
        var info = JSON.parse(body)
        console.dir(info)

        send_rci = (data.info.p_sendRciMsg == 'true')
        if (send_rci) rci_cmd  = data.info.p_documentCommandHeader

        log.debug('data.info send rci : ' + send_rci)
        log.debug('data.info send type: ' + rci_cmd)
      }      
      catch (e) {
        log.error('error parsing ci response body: ' + body)
        if (send_rci && ! rci_cmd) rci_cmd = 'ADD' // default add if parsing error
      }

      // conditional logic to send RCI if needed (as indicated by /ci response)
      //if (!err && (res_body.indexOf('p_sendRciMsg=true') > -1 || res_body.indexOf('p_sendRciMsg\\u003dtrue') > -1)) {
      if (send_rci) {
        log.debug('generating and sending rci for item ' + item.gtin)
        var rci_xml = config.gdsn.create_rci_to_gr(item, rci_cmd)
        log.debug('RCI: ' + rci_xml)
        var start = Date.now()
        outbox.send_from_dp(rci_xml, function(send_err, result) {
          log.debug('outbox.send_from_dp completed in ' + (Date.now() - start) + ' ms')
          if (send_err) log.error(send_err)
          else log.info(result)
        })
      }
      else { // skip RCI
        log.debug('skipping rci for item ' + item.gtin)
      }
      done(null, format_result(err, response, res_body, item, 'Registration')) // end of processing for each item

    }) // end request.post
  } // end register_item

  function format_result(err, response, res_body, item, errorType) {
    log.debug('mds_register.format_result - res_body: ' + res_body)
    var result = {
      success: false
      ,errors: []
      ,errorType: (errorType || 'Validation')
    }
    item = item || {}
    result.gtin                 = item.gtin                 || ''
    result.tm                   = item.tm                   || ''
    result.tm_sub               = item.tm_sub               || ''
    result.itemOwnerProductCode = item.itemOwnerProductCode || ''
    result.vendorId             = item.vendorId             || ''
    result.buyerId              = item.buyerId              || ''
    result.portalChar           = item.portalChar           || ''

    if (err) {
      result.errors.push({message: err.message || 'na', xPath: '', attributename: ''})
      return result
    }

    if (!res_body) {
      result.errors.push({message: 'missing res_body', xPath:'', attributename:''})
      return result
    }

    var body = {success: false, error: 'json parse error'}
    try {
      body = JSON.parse(res_body)
      console.log('success value from res_body: "' + body.success + '"')
    }
    catch (err) {
      console.log('mds json parse error: ' + err)
    }

    if (!body.success || !response || response.statusCode > 400) {
      result.errors.push({message: body.error, xPath:'', attributename:''})
      return result
    }

    result.success = true
    result.errorType = ''
    return result
  } // end format_result

  return api
}
