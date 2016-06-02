> An easy rest mapper for browsers and nodejs. Works on IE8+ and modern browsers.

Build on top axios - https://github.com/mzabriskie/axios

Inspiration on Mappersmith - https://github.com/tulios/mappersmith

## Install

```
npm install rest-mapper --save
```

## Usage

For browsers that has not support for __Promise__, please use some polyfill.

#### Browsers with webpack and babel
```
import Mapper from 'rest-mapper';
```

#### NodeJS
```
var Mapper = require('rest-mapper').default;
```

```javascript

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

### CRUD

To use the crud, just put the crud property and its resources with the `baseURL`. For example:

```javascript
import Mapper from 'rest-mapper';


let Github = new Mapper({
  host: 'https://api.github.com',

  cruds: {
    Users: { baseURL: '/users' },
    Issues: { baseURL: '/issues' },
    Repo: { 
      baseURL: '/repositories',
      defaults: {
        headers: {
          'Foo': 'Bar'
        }
      }
    }
  }
});
```

The resources, `Users, Issues, Repo`, now have the methods: `all, get, create, update, delete`.

It is just simple to use:

```javascript
// List all users
Github.Users.all()
  .then(res => res.data);

// Get an user by id
Github.Users.get({
  params: { id: 'cezarlz' }
})
  .then(res => res.data);

// Delete an issue by id
Github.Issues.delete({
  params: { id: 'cezarlz' }
})
  .then(res => res.data);

// Create a new user
Github.Users.create({
  // Send any data you want  
  data: {
    foo: 'bar'
  },
  headers: {
    'Authorization': 'token 123'
  }
})
  .then(res => res.data);

// Update a repo by id with some options (See AJAX questions on docs section)
Github.Repo.update({
  params: { id: 'rest-mapper' },
  data: { foo: 'bar' },
  headers: { 'Content-Type': 'application/json' },
  timeout: 2000
})
  .then(res => res.data);
```

## Docs

For AJAX questions, see: https://github.com/mzabriskie/axios

#### Instantiating

```javascript
// Browsers
import Mapper from 'rest-mapper';

// NodeJS
var Mapper = require('rest-mapper').default;

let YourAPI = new Mapper({
  host: 'https://api.you.domain/v1'
});
```

#### Resources and Methods

The resources are the "groups" of your API. And for each resource, you will need add some methods.

##### Methods properties

Name | Type | Required? | Default | More
-----|------|-----------|---------|-----
`url`|`string`|Yes|-|-
`method`|`string`|No|`get`|-
`supplant`|`object`|No|-|Use `supplant` only when your `url` is like `/users/{id}`. Supplant will replace `{id}` for your `id` value from object.

For others properties like `params`, `data`, `headers`, `timeout`, etc, please, read the ![axios documentation](https://github.com/mzabriskie/axios).

##### Crud

Name | Type | Required? | Default | More
-----|------|-----------|---------|-----
`baseURL`|`string`|Yes|-|Your `baseURL` will be the base for the methods that will created.
`defaults`|`object`|No|-|Axios request object. For more information, please, read the ![axios documentation](https://github.com/mzabriskie/axios).

When you use the `crud`, you will have five methods (assuming your base is `/users`):

* `all` - `GET /users`
* `get` - `GET /users/{id}` - _I heard a supplant here?_
* `create` - `POST /users`
* `update` - `PATCH /users/{id}`
* `delete` - `DELETE /users/{id}`

##### Intercept

Yes, you can intercept all of your requests. See the Usage section above for more information.

##### Default values

You can set default value __for all of your requests.__ See the Usage section above for more information.


## Test

rest-mapper uses Jasmine for tests. So, install jasmine and then execute:

```
jasmine
```

## Versions / Changelog

###### 1.4.0
* Removed singleton, because you can have many instances for multiple hosts
* Back to object-merge library
* RestMapper is isomorphic now, what I mean, it works on browsers and nodejs
* Made tests using Jasmine
* Some performance improvements
* Added __CRUD__ support, rest-mapper will create for you five methods: `all, get, create, update, delete`

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