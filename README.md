# JSMongoQuery

Mongo queries in JavaScript

JSMongoQuery implements MongoDB queries in JavaScript, allowing developers to query a 'document' (an array containing data) against a Mongo query object, returning a boolean value for pass or fail.  Additionally a set of documents can be queried to filter them, as queries are used in MongoDB.

This code is used at Akkroo to allow the construction of advanced form logic queries in our web application.

For PHPMongoQuery visit https://github.com/Akkroo/PHPMongoQuery

## Usage

```
var JSMongoQuery = require('JSMongoQuery');

var query = {
	a: 'foo',
	b: {
		'$ne': 'bar'
	}
};

var doc = {
	id: 1,
	a: 'foo',
	b: 'barr'
};
console.log("Result: ", JSMongoQuery.executeQuery(query, doc));
```

This will output

```
Result: true
```

## Methods

### executeQuery(query, documents, options)

Execute a query on a single document, returning a boolean value for pass or fail:

```
var query = {a: {'$gte': 4}};
var doc = {a: 3};
console.log("Result:", JSMongoQuery.executeQuery(query, doc));
```

Output:

```
Result: false
```

### appendFieldSpecifier(query, append)

Append a field specifier to any field queries. For example, your query may have been written as follows:

```
var query = {a: 'foo'};
```

However, the actual document structure is

```
var doc = {
	a: {value: 'foo'},
	b: {value: 'bar'}
};
```

So you need to append the `value` specifier to the query field specifiers for the query to work. For example:

```
var newQuery = JSMongoQuery.appendFieldSpecifier(query, 'value');
console.log("newQuery:", newQuery);
```

Output:

```
newQuery: { 'a.value': 'foo' }
```

### getDependentFields(query)

Parse a query to find all the fields it depends on. This is useful for listening to when those values change, so the query is only repeated when the result could have changed. For example:

```
var query = {a: 'foo'};
var dependentFields = JSMongoQuery.getDependentFields(query);
console.log("Dependent fields:", dependentFields);
```

Output:

```
Dependent fields: [ 'a' ]
```

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
