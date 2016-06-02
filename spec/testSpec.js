'use strict';

let Mapper = require('../lib/rest-mapper.js').default;

let userMock = {
  "login": "cezarlz",
  "id": 954889,
  "avatar_url": "https://avatars.githubusercontent.com/u/954889?v=3",
  "gravatar_id": "",
  "url": "https://api.github.com/users/cezarlz",
  "html_url": "https://github.com/cezarlz",
  "followers_url": "https://api.github.com/users/cezarlz/followers",
  "following_url": "https://api.github.com/users/cezarlz/following{/other_user}",
  "gists_url": "https://api.github.com/users/cezarlz/gists{/gist_id}",
  "starred_url": "https://api.github.com/users/cezarlz/starred{/owner}{/repo}",
  "subscriptions_url": "https://api.github.com/users/cezarlz/subscriptions",
  "organizations_url": "https://api.github.com/users/cezarlz/orgs",
  "repos_url": "https://api.github.com/users/cezarlz/repos",
  "events_url": "https://api.github.com/users/cezarlz/events{/privacy}",
  "received_events_url": "https://api.github.com/users/cezarlz/received_events",
  "type": "User",
  "site_admin": false,
  "name": "Cezar Luiz",
  "company": "Snowman Labs",
  "blog": null,
  "location": "Brasil",
  "email": "cezarluiz.c@gmail.com",
  "hireable": true,
  "bio": null,
  "public_repos": 53,
  "public_gists": 5,
  "followers": 33,
  "following": 74,
  "created_at": "2011-08-02T19:33:53Z",
  "updated_at": "2016-05-20T17:16:09Z"
};

let Github = new Mapper({
  host: 'https://api.github.com',

  resources: {
    Repo: {
      getRepos: { url: '/repositories' },
      getNotFoundRepos: { url: '/repos' }
    }
  },

  cruds: {
    Users: { baseURL: '/users' }
  }
});

describe('Rest Mapper Tests', function() {
  describe('Async Tests', function () {
    it('status code should be 200', function(done) {
      Github.Users.all()
        .then(res => {
          expect(res.status).toBe(200);
          done();
        });
    });

    it('status code should be 404', function(done) {
      Github.Repo.getNotFoundRepos()
        .catch(err => {
          expect(err.status).toBe(404);
          done();
        })
    });

    it('users/cezarlz should be equal userMock', function(done) {
      Github.Users.get({
        supplant: { id: 'cezarlz' }
      })
        .then(res => {
          expect(res.data).toEqual(userMock);
          done();
        });
    });

    it('users/cezarlz login should be equal userMock login', function(done) {
      Github.Users.get({
        supplant: { id: 'cezarlz' }
      })
        .then(res => {
          expect(res.data.login).toEqual(userMock.login);
          done();
        });
    });

  });

  describe('Sync Tests', function () {
    it('the function that not exist should be undefined', function() {
      expect(Github.Users.allPopularUsers).toBe(undefined);
    });

    it('the crud\'s functions should exist', function() {
      expect(Github.Users.all).not.toBe(undefined);
      expect(Github.Users.get).not.toBe(undefined);
      expect(Github.Users.create).not.toBe(undefined);
      expect(Github.Users.update).not.toBe(undefined);
      expect(Github.Users.delete).not.toBe(undefined);
    });
  });
});