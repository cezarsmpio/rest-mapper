import axios from 'axios';
import merge from 'object-merge';

class RestMapper {
  constructor(config) {
    const defaultConfig = {
      host: '',
      resources: {},
      cruds: {},
      intercept: false
    };

    const c = merge({}, defaultConfig, config);

    this.host = c.host;
    this.resources = c.resources;
    this.cruds = c.cruds;
    this.intercept = c.intercept;

    // Defaults
    const defaults = {
      method: 'get'
    };

    this.defaults = merge({}, defaults, c.defaults);

    // Create an axios instance
    this.axios = axios.create(merge({}, this.defaults, {
      baseURL: this.host
    }));

    // Intercept
    this.buildIntercept();

    return this.build(c);
  }

  build(config) {
    let obj = {};

    // Loop the cruds
    for (let prop in this.cruds) {
      obj[prop] = {};

      // If the current crud has the property baseURL
      const crud = this.cruds[prop];

      if (crud.hasOwnProperty('baseURL')) {
        let baseURL = crud.baseURL;
        let methods = [
          { name: 'all', type: 'get', url: baseURL },
          { name: 'get', type: 'get', url: `${baseURL}/{id}` },
          { name: 'create', type: 'post', url: baseURL },
          { name: 'update', type: 'patch', url: `${baseURL}/{id}` },
          { name: 'delete', type: 'delete', url: `${baseURL}/{id}` }
        ];

        // Runs inside methods
        for (let i = 0, t = methods.length; i < t; i++) {
          let method = methods[i];

          let resource = merge({}, crud.defaults, {
            url: method.url,
            method: method.type
          });

          obj[prop][method.name] = this.call.bind(this, resource);
        }
      }
      else {
        return Promise.reject('Please, set a baseURL property to create your cruds methods.')
      }
    }

    // Percorre os resources
    for (let prop in this.resources) {
      // Check if obj has the crud resource
      obj[prop] = obj.hasOwnProperty(prop) ? obj[prop] : {};

      // Percorre os filhos do resource
      for (let method in this.resources[prop]) {
        let resources = this.resources[prop][method];

        obj[prop][method] = this.call.bind(this, resources);
      }
    }

    return obj;
  }

  call(resources, params = {}) {
    let options = merge({}, resources, params);

    options.url = resources.hasOwnProperty('url') ? resources.url : '';

    if (options.hasOwnProperty('supplant')) {
      options.url = this.supplant(options.url, options.supplant);
    }

    return this.axios.request(options);
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
            if (!!intercept.request.before) intercept.request.before(config);

            return config;
          },
          // request error
          function (error) {
            if (!!intercept.request.error) intercept.request.error(error);

            return Promise.reject(error);
          }
        );
      }

      // response
      if (!!intercept.response) {
        axios.interceptors.response.use(
          // response success
          function (response) {
            if (!!intercept.response.success) intercept.response.success(response);

            return response;
          },
          // response error
          function (error) {
            if (!!intercept.response.error) intercept.response.error(error);

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