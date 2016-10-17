# Web Version

We now have an UI version online, Check http://specgen.apistudio.io/

# api2swagger

Generate Swagger 2.0 (Open API) spec from Curl like API Call.

# Installation

You can install `api2swagger` either through npm or by cloning and linking the code from GitHub.  This document covers the installation details for installing from npm.

## Installation from npm

The `api2swagger` module and its dependencies are designed for Node.js and is available through npm using the following command:

### From a Terminal Window:
```bash
$ sudo npm install -g api2swagger
```

# Options
| Entry | Explanation |
| ----- | ----------- |
| -e, --endpoint | Rest API Endpoint |
| -o, --output | Swagger destination location filename |
| -X, --httpMethod | HTTP Method Name - Allowed HEAD, GET, POST, PUT, DELETE |
| -d, --data | POST / PUT Data |
| -H, --header | Request Headers to be included. |
| -P, --proxy | proxy detail - http://username:password@proxyhost:proxyport |

Notes on options

| Option | Notes |
| ------ | ----- |
| data | Use single-quotes around a JSON string, and on Windows escape the double-quotes within the string by prepending a / i.e. '{ \"grant_type\" : \"XXYYZZ\" }' |
|header |  Quotes should be used, and multiple headers can be specified by giving multiple -H entries |

#### Examples

```bash
$ api2swagger -e "https://accounts.apigee.com/status" -X GET -o /Users/Anil/Desktop/sampleSwagger.json
```

#### Articles

<a href="https://community.apigee.com/articles/15397/api2swagger-open-api-swagger-20-spec-generator-fro.html">Getting Started with API2Swagger - Api2Swagger : Open API (Swagger) 2.0 Spec Generator - Command line tool</a>
