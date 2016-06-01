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
      before: function (config) {
        ui.showLoading();
      },
      error: function (err) {
        // no god, no
      }
    },
    response: {
      success: function (responseData) {
        ui.hideLoading();
      },
      error: function (err) {
        // oh my app
      }
    }
  },

  // Default options for all requests
  defaults: {
    method: 'post',
    headers: {
      'Content-Type': 'application/json'
    },
    params: {
      category: 'all'
    },
    data: {
      key: 'my_key_123'
    },
    timeout: 3000
  },

  resources: {
    Auth: {
      signin: { url: '/access/signin', method: 'post' },
      recovery: { url: '/access/recovery' }
    },
    User: {
      save: { url: '/users/{id}', method: 'put' } // {id} is supplant
    },
    Products: {
      get: { url: '/products' },
      getByDate: { url: '/products/date/{startDate}/{endDate}' }
    }
  }
});
```

#### Pass data using methods body, put or patch
```javascript
// POST /access/signin REQUEST username=foo&password=bar

API.Auth
  .signin({
    data: {
      username: 'foo',
      password: 'bar'
    }
  })
  .then((data) => {
    // response
  });
```


#### Supplant example
```javascript
// POST /users/3

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
```

#### Get all products by query string
```javascript
// GET /products?page=2

API.Products
  .get({
    params: {
      page: 2
    }
  })
  .then((data) => {
    // response
  });
```


#### Get products by range date
```javascript
// GET /products/date/2015-11-30/2015-12-25?status=active

API.Products
  .getByDate({
    supplant: { startDate: '2015-11-30', endDate: '2015-12-25' },
    params: { status: 'active' }
  })
  .then((data) => {
    // response
  })
  .catch((err) => {
    // error
  })
  .then(() => {
    // complete
  });
```

## Docs

Docs are coming... But how this lib was build on axios, you can read more about here https://github.com/mzabriskie/axios

## Test

Tests are coming...

## Versions

###### 1.3.0
* Updated axios to 0.12.0 and changed object-merge to deepmerge

###### 1.2.6
* Some hotfixes around URL and Axios Update

###### 1.2.5
* Url hotfix

###### 1.2.4
* Supplant double host fixed

###### 1.2.3
* Use spread operator instead object-merge

###### 1.2.2
* Url without supllant bug 1.2.1 fixed

###### 1.2.1
* Supplant bug 1.2.0 fixed

###### 1.2.0 :dizzy:
* Added default params for all requests

###### 1.1.2 :snowflake:
* Change intercept logic

###### 1.1.1 :zap:
* Singleton pattern, better performance

###### 1.1.0 :cyclone:
* Added interceptors

###### 1.0.0 :star:
* Create the rest-mapper
* Call ajax requests build top on axios
* resources
* hosts