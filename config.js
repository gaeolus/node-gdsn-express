var config = {
    shut_down_pw          : ''                         // for remote server shutdown, empty to disable shutdown service
  , http_port             : 8080                       // used internally for dashboard and load balanced traffic
  , http_host             : 'localhost'                // hostname used for http redirects/auth
  , homeDataPoolGln       : '1100001011285'            // GLN of home data pool, only single DP is supported for now!
  , gdsn_gr_gln           : '0614141810017'            // GLN of GS1 GDSN Global Registry (GR)
  , gs1_rpdd_url          : 'http://gs1beta2.gs1globalregistry.net/eanucc/dumps/partydump/GS1PartyDump.xml'
  , gs1_schema_url        : 'http://www.gdsregistry.org/3.1/schemas'
  , debug                 : true                       // additional logging
  , db_url                : 'catalog_services'         // for localhost MongoDb, used by lib/database.js
  , inbox_dir             : __dirname + '/msg/inbox'   // watch directory for incoming messages
  , outbox_dir            : __dirname + '/msg/outbox'  // for outgoing messages sent by the data pool
  , routes_dir            : __dirname + '/routes'
  //  Optional HTTPS/TLS/SSL:
  //, https_port            : 8443                     // potentially used for public access to dashboard without vpn, TBD
  //, https_host            : 'localhost'              // hostname used for https redirects/auth
  //, key_file              : __dirname + '/dev_key.pem'
  //, cert_file             : __dirname + '/dev_key-cert.pem'
  , gpc_file              : __dirname + '/data/gpc/GS1_Combined_Published_as_at_01062014.xml'
  , per_page_count        : 10
  , base_url              : '/cs_api/1.0'
  , slow_warn_ms          : 1200
  , url_gdsn_api          : 'http://localhost:8080/gdsn-server/api'
  , item_default_gtin     : '00000000000000'
  , item_default_gpc      : '99999999'
  , as2_gln_list          : ['9501101020641','0850522001029','4049111180016','7300027777712','5210047000047','0614141810017']
  , send_rci              : true
}

// config methods
config.toString = function () {
  var as_string = ''
  var self = this
  for (var prop in self) {
    as_string += '\n'
    if (self.hasOwnProperty(prop)) as_string += '*** '
    as_string += '"' + prop + '": "' + self[prop] + '"'
  }
  return as_string
}

var local_config = {}
try {
  //var file = process.env['NODE_LOCAL_CONFIG'] || './config.js.STAGE'
  var file = process.env['NODE_LOCAL_CONFIG'] || '/home/node/local_config.js'
  try {
    local_config = require(file)
    console.log('local_config loaded from file: ' + file)
  }
  catch (err) {
    console.log('local_config NOT loaded from file, err: ' + err)
  }
}
catch (e) {
  console.log('local_config NOT loaded from file \'' + file + '\', error: ' + e)
}

for (var prop in local_config) {
  if (local_config.hasOwnProperty(prop)) config[prop] = local_config[prop]
}

module.exports = config
