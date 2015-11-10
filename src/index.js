import axios from 'axios';
import assign from 'object-assign';

class RestEasy {
  constructor(config) {
    this.host = config.host;
    this.resources = config.resources;

    return this.build(config);
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

    return axios(options);
  }

  supplant(str, o) {
    return str.replace(/{([^{}]*)}/g, function (a, b) {
      var r = o[b];
      return typeof r === 'string' || typeof r === 'number' ? r : a;
    });
  }
}

export default RestEasy;