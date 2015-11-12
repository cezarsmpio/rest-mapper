'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _axios = require('axios');

var _axios2 = _interopRequireDefault(_axios);

var _objectAssign = require('object-assign');

var _objectAssign2 = _interopRequireDefault(_objectAssign);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var restMapperInstance = null;

var RestMapper = (function () {
  function RestMapper(config) {
    _classCallCheck(this, RestMapper);

    this.host = config.host;
    this.resources = config.resources;
    this.intercept = config.intercept || false;

    // Add singleton
    if (!restMapperInstance) {
      restMapperInstance = this;
    }

    // Intercept
    this.buildIntercept();

    return restMapperInstance.build(config);
  }

  _createClass(RestMapper, [{
    key: 'build',
    value: function build(config) {
      var obj = {};

      // Percorre os resources
      for (var prop in this.resources) {
        obj[prop] = {};

        // Percorre os filhos do resource
        for (var method in this.resources[prop]) {
          var m = this.resources[prop][method];

          obj[prop][method] = this.call.bind(this, m);
        }
      }

      return obj;
    }
  }, {
    key: 'call',
    value: function call(obj, params) {
      var options = (0, _objectAssign2.default)({}, obj, params);
      var supplant = this.supplant(options.url, options.supplant);

      options.url = '' + this.host + supplant;

      return (0, _axios2.default)(options);
    }
  }, {
    key: 'buildIntercept',
    value: function buildIntercept() {
      var _this = this;

      // Create Interceptors
      if (this.intercept) {
        (function () {
          var intercept = _this.intercept;

          // request
          if (!!intercept.request) {
            _axios2.default.interceptors.request.use(
            // before send
            function (config) {
              if (!!intercept.request.before) intercept.request.before.call(null, config);

              return config;
            },
            // request error
            function (error) {
              if (!!intercept.request.error) intercept.request.error.call(null, error);

              return Promise.reject(error);
            });
          }

          // response
          if (!!intercept.response) {
            _axios2.default.interceptors.response.use(
            // response success
            function (response) {
              if (!!intercept.response.success) intercept.response.success.call(null, response);

              return response;
            },
            // response error
            function (error) {
              if (!!intercept.response.error) intercept.response.error.call(null, error);

              return Promise.reject(error);
            });
          }
        })();
      }
    }
  }, {
    key: 'supplant',
    value: function supplant(str, o) {
      return str.replace(/{([^{}]*)}/g, function (a, b) {
        var r = o[b];
        return typeof r === 'string' || typeof r === 'number' ? r : a;
      });
    }
  }]);

  return RestMapper;
})();

exports.default = RestMapper;