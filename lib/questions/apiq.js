var inquirer = require("inquirer");

var queryParamQuestions = [
  { name: 'description',     message: 'Description of Query Param ?', default: 'Query Param description goes here..'},
  { name: 'required', message: 'Is Above Query param required ?', type: 'confirm'},
  { name: 'type', message: 'Date type of query param ?', type: 'list', choices: [ "string", "number", "boolean" ]},
  { name: 'possibleValues', message: 'Comma Separated possible values?'}
];

var urlParamQuestions = [
  { name: 'name',     message: 'Name of URL Param ?', default: ''},
  { name: 'description',     message: 'Description of URL Param ?', default: ''},
  { name: 'type', message: 'Date type of query param ?', type: 'list', choices: [ "string", "integer", "boolean" ]}
];

var bodyJsonQuestion = [
  { name: 'name',     message: 'Name of URL Param ?', default: 'body'},
  { name: 'description',     message: 'Description of URL Param ?', default: 'Request Payload Body'},
];

var headerParamQuestions = [
  { name: 'name',     message: 'Name of URL Param ?'},
  { name: 'description',     message: 'Description of URL Param ?', default: 'Header Param Description'},
  { name: 'type', message: 'Date type of query param ?', type: 'list', choices: [ "string", "integer", "boolean" ]}
];

var apiInfoQuestions = [
  { name: 'description',     message: 'A verbose explanation of the operation behavior.  ?', default: 'API Method Description'},
  { name: 'summary',     message: 'A short summary of what the operation does. ?', default: 'Short Summary of API Method'},
  { name: 'externalDocsUrl',     message: 'Additional external documentation for this operation. ?', default: 'http://docs.example.com/management/apis/get/entities'},
  { name: 'operationId',     message: 'Unique string used to identify the operation. ?', default: 'uniqueId'},
  { name: 'tags',     message: 'A list of tags for API documentation control.  ?', default: 'api2swagger'},
];

module.exports.queryParamQ = function(paramName, paramValue, callback) {
  queryParamQuestions[3].default = paramValue;
  inquirer.prompt(queryParamQuestions, function( answers ) {
    var param = {};
    param.in = 'query';
    param.name = paramName;
    param.description = answers.description;
    param.type = answers.type;
    param.required = answers.required;
    param.enum = answers.possibleValues.split(',');
    callback(param);
  });
}


module.exports.formParamQ = function(paramName, paramValue, callback) {
  queryParamQuestions[3].default = paramValue;
  inquirer.prompt(queryParamQuestions, function( answers ) {
    var param = {};
    param.in = 'form';
    param.name = paramName;
    param.description = answers.description;
    param.type = answers.type;
    param.required = answers.required;
    param.enum = answers.possibleValues.split(',');
    callback(param);
  });
}

module.exports.urlParamQ = function(paramName, callback) {
  inquirer.prompt(urlParamQuestions, function( answers ) {
    var param = {};
    param.in = 'path';
    param.name = answers.name;
    param.description = answers.description;
    param.required = true;
    param.type = answers.type;
    callback(param);
  });
}

module.exports.headerParamQ = function(headerName, headerValue, callback) {
  headerParamQuestions[0].default = headerName;
  var headerSampleValues = new Array();
  headerSampleValues.push(headerValue);
  inquirer.prompt(headerParamQuestions, function( answers ) {
    var param = {};
    param.in = 'header';
    param.name = headerName;
    param.description = answers.description;
    param.required = true;
    param.type = answers.type;
    param.enum = headerSampleValues;
    callback(param);
  });
}

module.exports.bodyJsonQ = function(schema, callback) {
  inquirer.prompt(bodyJsonQuestion, function( answers ) {
    var param = {};
    param.in = 'body';
    param.name = answers.name;
    param.description = answers.description;
    param.required = true;
    param.schema = schema;
    callback(param);
  });
}

module.exports.apiInfoQ = function(data, callback) {
  inquirer.prompt(apiInfoQuestions, function( answers ) {
    var apiInfo = {};
    answers.tags = answers.tags.split(',');
    answers.externalDocs = {};
    answers.externalDocs.description = "Find out more";
    answers.externalDocs.url = answers.externalDocsUrl;
    callback(answers);
  });
}