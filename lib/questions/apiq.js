var inquirer = require("inquirer");

var queryParamQuestions = [
  { name: 'description',     message: 'Description of Query Param ?'},
  { name: 'required', message: 'Is Above Query param required ?', type: 'confirm'},
  { name: 'type', message: 'Date type of query param ?', type: 'list', choices: [ "string", "number", "boolean" ]},
  { name: 'possibleValues', message: 'Comma Separated possible values?'}
];

module.exports.queryParamQ = function(paramName, paramValue, callback) {
  queryParamQuestions[3].default = paramValue;
  inquirer.prompt(queryParamQuestions, function( answers ) {
    var param = {};
    param.in = 'query';
    param.name = paramName;
    param.description = answers.description;
    param.type = answers.type;
    param.enum = answers.possibleValues.split(',');
    callback(param);
  });
}