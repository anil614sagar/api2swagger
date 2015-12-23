module.exports = {
  errorMessage: errorMessage
};

var errorCodes = {
  '01': {
    title: 'Input missing',
    message: 'API Endpoint is missing to make a call',
    details: 'Make sure you specify endpoint using -e option. For Example ' +
    'swaggergen -e http://example.com/helloWorld'
  },
  '02': {
    title: 'Invalid hostname',
    message: 'API Endpoint is invalid to make a call',
    details: 'Make sure you specify http endpoint using -e option. For Example ' +
    'swaggergen -e http://example.com/helloWorld'
  },
  '03': {
    title: 'Invalid hostname',
    message: 'API Endpoint is invalid only http, https, ws, wss supported',
    details: 'Make sure you specify http endpoint using -e option. For Example ' +
    'swaggergen -e http://example.com/helloWorld'
  },
  '04': {
    title: 'Invalid Method Name',
    message: 'Method name is invalid only HEAD, GET, POST, PUT, DELETE supported',
    details: 'Make sure you specify http method using -X option. For Example ' +
    'swaggergen -e http://example.com/helloWorld -X POST'
  }
};

function errorMessage(code) {
  return errorCodes[code];
}