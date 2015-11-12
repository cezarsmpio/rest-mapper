import axios from 'axios';
import assign from 'object-assign';

let restMapperInstance = null;

class RestMapper   {
  constructor(config) {
    this.host = config.host;
    this.resources = config.resources;
    this.intercept = config.intercept || false;

    // Add singleton
    if(!restMapperInstance){
      restMapperInstance = this;
    }

    return restMapperInstance.build(config);
  }

  build(config) {
    let obj = {};

    // Percorre os resources
    for (let prop in this.resources) {
      obj[prop] = {};

      // Percorre os filhos do resource
      for (let method in this.resources[prop]) {
        let m = this.resources[prop][method];

        obj[prop][method] = this.call.bind(this, m);
      }
    }

    return obj;
  }

  call(obj, params) {
    let options = assign({}, obj, params);
    let supplant = this.supplant(options.url, options.supplant);

    options.url = `${ this.host }${ supplant }`;

    // Intercept
    this.buildIntercept();

    return axios(options);
  }

  buildIntercept() {
    // Create Interceptors
    if (this.intercept) {
      let intercept = this.intercept;

      // request
      if (!!intercept.request) {
        axios.interceptors.request.use(
          // before send
          function (config) {
            if (!!intercept.request.before) intercept.request.before.call(null, config);

            return config;
          },
          // request error
          function (error) {
            if (!!intercept.request.error) intercept.request.error.call(null, error);

            return Promise.reject(error);
          }
        );
      }

      // response
      if (!!intercept.response) {
        axios.interceptors.response.use(
          // response success
          function (response) {
            if (!!intercept.response.success) intercept.response.success.call(null, response);

            return response;
          },
          // response error
          function (error) {
            if (!!intercept.response.error) intercept.response.error.call(null, error);

            return Promise.reject(error);
          }
        );
      }
    }
  }

  supplant(str, o) {
    return str.replace(/{([^{}]*)}/g, function (a, b) {
      var r = o[b];
      return typeof r === 'string' || typeof r === 'number' ? r : a;
    });
  }
}

export default RestMapper;