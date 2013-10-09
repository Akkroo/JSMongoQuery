# JSMongoQuery

Mongo queries in JavaScript

JSMongoQuery implements MongoDB queries in JavaScript, allowing developers to query a 'document' (an array containing data) against a Mongo query object, returning a boolean value for pass or fail.  Additionally a set of documents can be queried to filter them, as queries are used in MongoDB.

This code is used at Akkroo to allow the construction of advanced form logic queries in our web application.

For PHPMongoQuery visit https://github.com/Akkroo/PHPMongoQuery

## Running tests

To run the test suite, first install the required dependencies:

```
npm install
```

then run the tests:

```
npm test
```

If you want to debug whilst running the tests (using `node-inspector`):

```
npm run-script debug
```
