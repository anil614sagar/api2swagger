var url = require('url');
var errorCodes = require('../errorCodes/command');
var questions = require('../questions/aboutq');
var apiq = require('../questions/apiq');
var async = require('async');
var request = require('request');
var HTTPStatus = require('http-status');
var jsonSchemaGenerator = require('json-schema-generator');
var fs = require('fs');

module.exports = {
  processRequest: processRequest
};

var swaggerSpec = {};
swaggerSpec.swagger = "2.0";
var hostMatch = false;
var basePathMatch = false;


function processRequest(options, cb) {
  if(options.endpoint == null) {
    // Error Code : 01 for missing endPoint
    var errorMessage = errorCodes.errorMessage("01");
    return cb(true, errorMessage);
  }
  // Extract Information needed for Swagger Spec
  var urlObj = url.parse(options.endpoint);
  if (urlObj.host == null) {
    // Error Code : 02 for invalid endPoint
    return cb(true, errorCodes.errorMessage("02"));
  }
  if (options.output == null) {
    // Error Code : 02 for invalid endPoint
    return cb(true, errorCodes.errorMessage("05"));
  }
  var supportedProtocols = ['http', 'https', 'ws', 'wss'];
  if (supportedProtocols.indexOf(urlObj.protocol.slice(0, -1)) == -1) {
    // Error Code : 03 for invalid protocol
    return cb(true, errorCodes.errorMessage("03"));
  }
  var supportedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD'];
  if (options.httpMethod == null) {
    options.httpMethod = 'GET';
  }
  if (supportedMethods.indexOf(options.httpMethod) == -1) {
    // Error Code : 03 for invalid protocol
    return cb(true, errorCodes.errorMessage("04"));
  }
  // Check if swagger source given in output - Update Operation
  try {
    // Query the entry
    stats = fs.lstatSync(options.output);
    var swaggerSpecRead = JSON.parse(fs.readFileSync(options.output, 'utf8'));
    if (swaggerSpecRead.host != urlObj.host) {
      return cb(true, errorCodes.errorMessage("06"));
    }
    hostMatch = true;
  }
  catch (e) {
    // Nothing for now..
  }
  // Check for basepath match
  if (urlObj.pathname.indexOf(swaggerSpecRead.basePath) == -1) {
    return cb(true, errorCodes.errorMessage("07"));
  } else {
    basePathMatch = true;
  }

  swaggerSpec.host = urlObj.host;
  swaggerSpec.schemes = new Array();
  swaggerSpec.schemes.push(urlObj.protocol.slice(0, -1));
  // Extract Possible Base Paths
  var pathComponents = urlObj.pathname.split("/");
  var possibleBasePaths = new Array();
  var tempBasePath = "";
  for (var key in pathComponents) {
    if (pathComponents[key] != '') {
      tempBasePath = tempBasePath + "/" + pathComponents[key];
      possibleBasePaths.push(tempBasePath);
    }
    else {
      possibleBasePaths.push("/");
    }
  }
  if (!hostMatch) {
    async.series({
        swaggerInfo: function (callback) {
          getSwaggerInfo(swaggerSpec, callback);
        },
        protocols: function (callback) {
          getProtocolInfo(swaggerSpec, urlObj, callback);
        },
        basePaths: function (callback) {
          getBasePathsInfo(swaggerSpec, possibleBasePaths, callback);
        },
        runApi: function (callback) {
          getApiRuntimeInfo(swaggerSpec, urlObj, options, false, callback);
        },
        extractQueryParams: function (callback) {
          getQueryParaminfo(swaggerSpec, urlObj, options, callback);
        }
      },
      function (err, results) {
        console.log(JSON.stringify(swaggerSpec, null, 2));
        fs.writeFile(options.output, JSON.stringify(swaggerSpec, null, 2), function (err) {
          if (err) {
            cb(err, {});
          }
          console.log("Swagger JSON File successfully generated in : " + options.output);
          cb(null, {});
        });
      }
    );
  }
  else {
    // Basepath & hostname matched, updated the swagger spec
    swaggerSpec = swaggerSpecRead;
    async.series({
        runApi: function (callback) {
          getApiRuntimeInfo(swaggerSpec, urlObj, options, true, callback);
        },
        extractQueryParams: function (callback) {
          getQueryParaminfo(swaggerSpec, urlObj, options, callback);
        }
      },
      function (err, results) {
        console.log(JSON.stringify(swaggerSpec, null, 2));
        fs.writeFile(options.output, JSON.stringify(swaggerSpec, null, 2), function (err) {
          if (err) {
            cb(err, {});
          }
          console.log("Swagger JSON File successfully generated in : " + options.output);
          cb(null, {});
        });
      }
    );
  }
}

function scan(obj)
{
  var k;
  if (obj instanceof Object) {
    for (k in obj){
      if (k=="required") {
        if (obj[k] instanceof Array) {
          if (obj[k].length == 0) {
            delete obj[k];
          }
        }
      }
      if (obj.hasOwnProperty(k)){
        //recursive call to scan property
        scan( obj[k] );
      }
    }
  } else {
    //not an Object so obj[k] here is a value
  };
};

var getSwaggerInfo = function(swaggerSpec, callback){
  questions.infoQ(null, function(answers) {
    swaggerSpec.info = answers;
    callback(null, true);
  });
};

var getProtocolInfo = function(swaggerSpec, urlObj, callback) {
    questions.protocolsQ(urlObj.protocol.slice(0, -1), function(answers) {
      if (answers.http) {
        swaggerSpec.schemes.push('http');
      }
      else if(answers.https){
        swaggerSpec.schemes.push('https');
      }
      callback(null, true);
    });
}

var getBasePathsInfo = function(swaggerSpec, possibleBasePaths, callback) {
  questions.basePathsQ(possibleBasePaths, function(answers) {
    swaggerSpec.basePath = answers.basePath;
    callback(null, true);
    console.log("Making an API Call & fetching more details...Please stay tuned..");
  });
}

var getApiRuntimeInfo = function(swaggerSpec, urlObj, options, update, callback) {
  var apiPath = urlObj.pathname.replace(swaggerSpec.basePath, "");
  if (apiPath == "") {
    apiPath = "/";
  }
  if (apiPath.charAt(0) != "/") {
    apiPath = "/" + apiPath;
  }
  request({url: options.endpoint}, function (error, response, body) {
    if (swaggerSpec.paths == null) {
      swaggerSpec.paths = {};
    }
    if (swaggerSpec.paths[apiPath] == null) {
      swaggerSpec.paths[apiPath] = {};
    }
    var pathMethod = options.httpMethod.toLowerCase();
    swaggerSpec.paths[apiPath][pathMethod] = {};
    swaggerSpec.paths[apiPath][pathMethod]["produces"] = new Array();
    swaggerSpec.paths[apiPath][pathMethod]["produces"].push(response.headers['content-type']);
    swaggerSpec.paths[apiPath][pathMethod]["responses"] = {};
    swaggerSpec.paths[apiPath][pathMethod]["responses"][response.statusCode] = {};
    swaggerSpec.paths[apiPath][pathMethod]["responses"][response.statusCode].description = HTTPStatus[response.statusCode];
    if (response.headers['content-type'] == 'application/json' && body != '') {
      var schemaObj = jsonSchemaGenerator(JSON.parse(body));
      delete schemaObj.$schema;
      // bug with json scheme generator - work around
      // For more details, https://github.com/krg7880/json-schema-generator/issues/13
      scan(schemaObj);
      swaggerSpec.paths[apiPath][pathMethod]["responses"][response.statusCode].schema = schemaObj;
    }
    swaggerSpec.paths[apiPath][pathMethod].security = new Array();
    if (response.request.headers.authorization && response.request.headers.authorization.startsWith('Basic')) {
      var basicSecurity =   {
        "basicAuth": []
      };
      swaggerSpec.securityDefinitions =  {
        "basicAuth": {
          "type": "basic",
          "description": "HTTP Basic Authentication. Works over `HTTP` and `HTTPS`"
        }
      };
      swaggerSpec.paths[apiPath][pathMethod].security.push(basicSecurity);
    }
    callback(null, true);
  });
}


var getQueryParaminfo =  function(swaggerSpec, urlObj, options, callback) {
  // TODO : redundant code, need better way
  var apiPath = urlObj.pathname.replace(swaggerSpec.basePath, "");
  if (apiPath == "") {
    apiPath = "/";
  }
  if (apiPath.charAt(0) != "/") {
    apiPath = "/" + apiPath;
  }
  var pathMethod = options.httpMethod.toLowerCase();
  if (urlObj.query != null && urlObj.query.split("&").length > 0) {
    var queryParams = urlObj.query.split("&");
    swaggerSpec.paths[apiPath][pathMethod]["parameters"] = new Array();
    async.eachSeries(queryParams, function iterator(queryparam, qcallback) {
      var keyValue = queryparam.split("=");
      console.log("api2swagger needs details realted to param : " + keyValue[0]);
      apiq.queryParamQ(keyValue[0], keyValue[1], function(answers) {
        swaggerSpec.paths[apiPath][pathMethod]["parameters"].push(answers);
        qcallback(null, true);
      });
    }, function done(error, data) {
      callback(null, true);
    });
  }
  else {
    callback(null, true);
  }
}
