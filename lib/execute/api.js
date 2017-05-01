var url = require('url');
var errorCodes = require('../errorCodes/command');
var questions = require('../questions/aboutq');
var apiq = require('../questions/apiq');
var async = require('async');
var request = require('request');
var HTTPStatus = require('http-status');
var jsonSchemaGenerator = require('json-schema-generator');
var fs = require('fs');
var inquirer = require("inquirer");

module.exports = {
  processRequest: processRequest
};

var swaggerSpec = {};
swaggerSpec.swagger = "2.0";
var hostMatch = false;
var basePathMatch = false;
var createNew = true;


function processRequest(options, cb) {
  if (options.endpoint == null) {
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
    createNew = false;
  }
  catch (e) {
    // Nothing for now..
  }

  // Check for basepath match
  if (!createNew) {
    if (urlObj.pathname.indexOf(swaggerSpecRead.basePath) == -1) {
      return cb(true, errorCodes.errorMessage("07"));
    } else {
      basePathMatch = true;
    }
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
  if (!hostMatch && createNew) {
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
        apiInfo: function (callback) {
          getApiInfo(swaggerSpec, urlObj, options, callback);
        },
        runtimeInfo: function (callback) {
          getApiRuntimeInfo(swaggerSpec, urlObj, options, false, callback);
        },
        queryParamInfo: function (callback) {
          getQueryParamInfo(swaggerSpec, urlObj, options, callback);
        },
        headerInfo: function (callback) {
          getHeaderInfo(swaggerSpec, urlObj, options, callback);
        },
        bodyInfo: function (callback) {
          getBodyInfo(swaggerSpec, urlObj, options, callback);
        },
        // Make sure you execute this last
        paramsInfo: function (callback) {
          getParamsInfo(swaggerSpec, urlObj, options, callback);
        }
      },
      function (err, results) {
        finish(swaggerSpec, options, err, results);
      }
    );
  }
  else {
    // Basepath & hostname matched, updated the swagger spec
    swaggerSpec = swaggerSpecRead;
    async.series({
        apiInfo: function (callback) {
          getApiInfo(swaggerSpec, urlObj, options, callback);
        },
        runtimeInfo: function (callback) {
          getApiRuntimeInfo(swaggerSpec, urlObj, options, true, callback);
        },
        queryParamInfo: function (callback) {
          getQueryParamInfo(swaggerSpec, urlObj, options, callback);
        },
        headerInfo: function (callback) {
          getHeaderInfo(swaggerSpec, urlObj, options, callback);
        },
        bodyInfo: function (callback) {
          getBodyInfo(swaggerSpec, urlObj, options, callback);
        },
        // Make sure you execute this last
        paramsInfo: function (callback) {
          getParamsInfo(swaggerSpec, urlObj, options, callback);
        }
      },
      function (err, results) {
        finish(swaggerSpec, options, err, results);
      }
    );
  }
}

function scan(obj) {
  var k;
  if (obj instanceof Object) {
    for (k in obj) {
      if (k == "required") {
        if (obj[k] instanceof Array) {
          if (obj[k].length == 0) {
            delete obj[k];
          }
        }
      }
      if (obj.hasOwnProperty(k)) {
        //recursive call to scan property
        scan(obj[k]);
      }
    }
  } else {
    //not an Object so obj[k] here is a value
  }
  ;
};

var finish = function (swaggerSpec, options, err, results) {
  if (err != null) {
    console.log("error in the information-gathering phase - no output will be generated");
    return;
  }
  fs.writeFile(options.output, JSON.stringify(swaggerSpec, null, 2), function (err) {
    if (err) {
      console.log("Error writing Swagger JSON File to : " + options.output);
      return;
    }
    console.log(JSON.stringify(swaggerSpec, null, 2));
    console.log("Swagger JSON File successfully generated in : " + options.output);
  });
}

var getSwaggerInfo = function (swaggerSpec, callback) {
  questions.infoQ(null, function (answers) {
    swaggerSpec.info = answers;
    callback(null, true);
  });
};

var getApiInfo = function (swaggerSpec, urlObj, options, callback) {
  var apiPath = urlObj.pathname.replace(swaggerSpec.basePath, "");
  if (apiPath == "") {
    apiPath = "/";
  }
  if (apiPath.charAt(0) != "/") {
    apiPath = "/" + apiPath;
  }
  if (swaggerSpec.paths == null) {
    swaggerSpec.paths = {};
  }
  if (swaggerSpec.paths[apiPath] == null) {
    swaggerSpec.paths[apiPath] = {};
  }
  var pathMethod = options.httpMethod.toLowerCase();
  if (swaggerSpec.paths[apiPath][pathMethod] == null) {
    swaggerSpec.paths[apiPath][pathMethod] = {};
  }
  apiq.apiInfoQ(null, function (answers) {
    //Update API Path Information
    swaggerSpec.paths[apiPath][pathMethod]["description"] = answers.description;
    swaggerSpec.paths[apiPath][pathMethod]["summary"] = answers.summary;
    swaggerSpec.paths[apiPath][pathMethod]["externalDocs"] = answers.externalDocs;
    swaggerSpec.paths[apiPath][pathMethod]["operationId"] = answers.operationId;
    swaggerSpec.paths[apiPath][pathMethod]["tags"] = answers.tags;
    callback(null, true);
  });
};

var getProtocolInfo = function (swaggerSpec, urlObj, callback) {
  questions.protocolsQ(urlObj.protocol.slice(0, -1), function (answers) {
    if (answers.http) {
      swaggerSpec.schemes.push('http');
    }
    else if (answers.https) {
      swaggerSpec.schemes.push('https');
    }
    callback(null, true);
  });
}

var getBasePathsInfo = function (swaggerSpec, possibleBasePaths, callback) {
  questions.basePathsQ(possibleBasePaths, function (answers) {
    swaggerSpec.basePath = answers.basePath;
    callback(null, true);
  });
}

var getApiRuntimeInfo = function (swaggerSpec, urlObj, options, update, callback) {
  console.log("Making an API Call & fetching more details...Please stay tuned..");
  var apiPath = urlObj.pathname.replace(swaggerSpec.basePath, "");
  var pathMethod = options.httpMethod.toLowerCase();
  if (apiPath == "") {
    apiPath = "/";
  }
  if (apiPath.charAt(0) != "/") {
    apiPath = "/" + apiPath;
  }
  var requestUrl = {
    url: options.endpoint,
    method: pathMethod
  };
  if (options.proxy != null) {
    requestUrl['proxy'] = options.proxy;
  }
  if (options.data != null) {
    requestUrl['body'] = options.data;
  }
  if (options.headers != null && options.headers.length > 0) {
    requestUrl['headers'] = {};
    for (var i = 0; i < options.headers.length; i++) {
      var header = options.headers[i];
      var keyValue = header.split(":");
      requestUrl['headers'][keyValue[0]] = keyValue[1];
    }
  }
  request(requestUrl, function (error, response, body) {
    if (error != null) {
      //problem with the request - report & halt
      console.log("Error calling the API endpoint");
      console.log("Error returned is: " + error);
      callback("error received");
    } else {
      if (swaggerSpec.paths == null) {
        swaggerSpec.paths = {};
      }
      if (swaggerSpec.paths[apiPath] == null) {
        swaggerSpec.paths[apiPath] = {};
      }
      if (swaggerSpec.paths[apiPath][pathMethod] == null) {
        swaggerSpec.paths[apiPath][pathMethod] = {};
      }
      swaggerSpec.paths[apiPath][pathMethod]["produces"] = new Array();
      swaggerSpec.paths[apiPath][pathMethod]["produces"].push(response.headers['content-type']);
      swaggerSpec.paths[apiPath][pathMethod]["responses"] = {};
      swaggerSpec.paths[apiPath][pathMethod]["responses"][response.statusCode] = {};
      swaggerSpec.paths[apiPath][pathMethod]["responses"][response.statusCode].description = HTTPStatus[response.statusCode];
      if (response.headers['content-type'].indexOf('application/json') > -1 && body != '') {
        var schemaObj = jsonSchemaGenerator(JSON.parse(body));
        delete schemaObj.$schema;
        // bug with json scheme generator - work around
        // For more details, https://github.com/krg7880/json-schema-generator/issues/13
        scan(schemaObj);
        swaggerSpec.paths[apiPath][pathMethod]["responses"][response.statusCode].schema = schemaObj;
      }
      swaggerSpec.paths[apiPath][pathMethod].security = new Array();
      if (response.request.headers.authorization && response.request.headers.authorization.startsWith('Basic')) {
        var basicSecurity = {
          "basicAuth": []
        };
        swaggerSpec.securityDefinitions = {
          "basicAuth": {
            "type": "basic",
            "description": "HTTP Basic Authentication. Works over `HTTP` and `HTTPS`"
          }
        };
        swaggerSpec.paths[apiPath][pathMethod].security.push(basicSecurity);
      }
      callback(null, true);
    }
  });
}


var getQueryParamInfo = function (swaggerSpec, urlObj, options, callback) {
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
      console.log("Api2swagger needs details related to param : " + keyValue[0]);
      apiq.queryParamQ(keyValue[0], keyValue[1], function (answers) {
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


var getHeaderInfo = function (swaggerSpec, urlObj, options, callback) {
  // TODO : redundant code, need better way
  var apiPath = urlObj.pathname.replace(swaggerSpec.basePath, "");
  var pathMethod = options.httpMethod.toLowerCase();
  if (apiPath == "") {
    apiPath = "/";
  }
  if (apiPath.charAt(0) != "/") {
    apiPath = "/" + apiPath;
  }
  if (swaggerSpec.paths[apiPath][pathMethod]["parameters"] == null) {
    swaggerSpec.paths[apiPath][pathMethod]["parameters"] = new Array();
  }
  if (options.headers != null && options.headers.length > 0) {
    async.eachSeries(options.headers, function iterator(header, qcallback) {
      var keyValue = header.split(":");
      console.log("Api2swagger needs details related to Header : " + keyValue[0]);
      apiq.headerParamQ(keyValue[0], keyValue[1], function (answers) {
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

var getBodyInfo = function (swaggerSpec, urlObj, options, callback) {
  // TODO : redundant code, need better way
  var apiPath = urlObj.pathname.replace(swaggerSpec.basePath, "");
  var pathMethod = options.httpMethod.toLowerCase();
  if (apiPath == "") {
    apiPath = "/";
  }
  if (apiPath.charAt(0) != "/") {
    apiPath = "/" + apiPath;
  }
  if (swaggerSpec.paths[apiPath][pathMethod]["parameters"] == null) {
    swaggerSpec.paths[apiPath][pathMethod]["parameters"] = new Array();
  }
  if (options.data != null) {
    console.log("Please provide more details regarding request payload..");
    // json data - Check, Form Data - Check
    if (options.headers.length > 0) {
      var headerKeyValues = {};
      for (var i = 0; i < options.headers.length; i++) {
        var split = options.headers[i].split(':');
        headerKeyValues[split[0].trim()] = split[1].trim();
      }
      if (headerKeyValues['Content-Type'].indexOf('application/json') > -1 || headerKeyValues['content-type'].indexOf('application/json') > -1) {
        // Found JSON
        var schemaObj = jsonSchemaGenerator(JSON.parse(options.data));
        delete schemaObj.$schema;
        // bug with json scheme generator - work around
        // For more details, https://github.com/krg7880/json-schema-generator/issues/13
        scan(schemaObj);
        // get details
        apiq.bodyJsonQ(schemaObj, function (answers) {
          swaggerSpec.paths[apiPath][pathMethod]["parameters"].push(answers);
          callback(null, true);
        });
      }
      else if (headerKeyValues['Content-Type'] == 'application/x-www-form-urlencoded') {
        if (options.data.split("&").length > 0) {
          var formParams = options.data.split("&");
          async.eachSeries(formParams, function iterator(formParam, qcallback) {
            var keyValue = formParam.split("=");
            console.log("Api2swagger needs details related to form param : " + keyValue[0]);
            apiq.formParamQ(keyValue[0], keyValue[1], function (answers) {
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
      else {
        callback(null, true);
      }
    }
    else {
      apiq.bodyJsonQ(options.data, function (answers) {
        swaggerSpec.paths[apiPath][pathMethod]["parameters"].push(answers);
        callback(null, true);
      });
    }
  }
  else {
    callback(null, true);
  }
}

var getParamsInfo = function (swaggerSpec, urlObj, options, callback) {
  // TODO : redundant code, need better way
  var apiPath = urlObj.pathname.replace(swaggerSpec.basePath, "");
  var pathMethod = options.httpMethod.toLowerCase();
  if (apiPath == "") {
    apiPath = "/";
  }
  if (apiPath.charAt(0) != "/") {
    apiPath = "/" + apiPath;
  }
  if (swaggerSpec.paths[apiPath][pathMethod]["parameters"] == null) {
    swaggerSpec.paths[apiPath][pathMethod]["parameters"] = new Array();
  }
  // Ask whether path has any dynamic params
  var isParams = [
    {name: 'dynamicParams', message: 'API Path has any dynamic parameters ?', type: 'confirm'}
  ];
  inquirer.prompt(isParams, function (answers) {
    if (answers.dynamicParams) {
      var pathComponents = urlObj.pathname.split("/");
      var chooseParams = [
        {name: 'urlParams', message: 'Choose Dynamic Params in URL ?', type: 'checkbox', choices: pathComponents}
      ];
      var newApiPath = apiPath;
      inquirer.prompt(chooseParams, function (answers) {
        // Run param info call
        async.eachSeries(answers.urlParams, function iterator(urlParam, qcallback) {
          console.log("Api2swagger needs details related to param : " + urlParam);
          // construct new path too..
          apiq.urlParamQ(urlParam, function (answers) {
            newApiPath = newApiPath.replace(urlParam, "{" + answers.name + "}");
            swaggerSpec.paths[apiPath][pathMethod]["parameters"].push(answers);
            qcallback(null, true);
          });
        }, function done(error, data) {
          // replace apiPath with new one
          if (swaggerSpec.paths[newApiPath] == null) {
            swaggerSpec.paths[newApiPath] = swaggerSpec.paths[apiPath];
            delete swaggerSpec.paths[apiPath];
          }
          else {
            swaggerSpec.paths[newApiPath][pathMethod] = swaggerSpec.paths[apiPath][pathMethod];
            delete swaggerSpec.paths[apiPath];
          }
          callback(null, true);
        });
      });
    }
    else {
      callback(null, true);
    }
  });
}
