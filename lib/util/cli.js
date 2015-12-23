module.exports = {
  version: version
};

function version() {
  return require('../../package.json').version;
}