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


#### Examples

```bash
$ api2swagger -e "https://accounts.apigee.com/status" -X GET -o /Users/Anil/Desktop/sampleSwagger.json
```

#### Articles

<a href="https://community.apigee.com/articles/15397/api2swagger-open-api-swagger-20-spec-generator-fro.html">Getting Started with API2Swagger - Api2Swagger : Open API (Swagger) 2.0 Spec Generator - Command line tool</a>
