Build on top axios - https://github.com/mzabriskie/axios

Inspiration on Mappersmith - https://github.com/tulios/mappersmith

## Install

```
npm install rest-mapper
```

## Usage

```javascript
import Mapper from 'rest-mapper';

let API = new Mapper({
  host: 'http://you.api.domain/v1',

  intercept: {
    request: {
      before: function () {
        ui.showLoading();
      },
      error: function () {
        // no god, no
      }
    },
    response: {
      success: function () {
        ui.hideLoading();
      },
      error: function () {
        // oh my app
      }
    }
  },

  resources: {
    Auth: {
      signin: { url: '/access/signin', method: 'post' },
      recovery: { url: '/access/recovery' }
    },
    User: {
      save: { url: '/users/{id}', method: 'put' }
    },
    Products: {
      get: { url: '/products' }
    }
  }
});

API.Auth
  .signin({
    body: {
      username: 'foo',
      password: 'bar'
    }
  })
  .then((data) => {
    // response
  });


API.User
  .save({
    supplant: { id: 3 },
    headers: {
      'Authorization': 'token YOUR_SECURE_TOKEN',
      'Foo': 'bar'
    },
    method: 'post' // you can override params
  })
  .then((data) => {
    // response
    console.log(response.data);
    console.log(response.status);
    console.log(response.statusText);
    console.log(response.headers);
    console.log(response.config);
  })
  .catch((err) => {
    // error
  });


API.Products
  .get({
    params: {
      page: 2 // ?page=2
    }
  })
  .then((data) => {
    // response
  });
```

## Docs

More docs are coming... But how this lib was build on axios, you can read more about here https://github.com/mzabriskie/axios

## Test

Tests are coming...

## Versions

### 1.1.0 :cyclone:
* Added interceptors

### 1.0.0 :star:
* Create the rest-mapper
* Call ajax requests build top on axios
* resources
* hosts