(function(root, factory) {
	if (typeof exports === 'object') {
		// CommonJS
		factory(exports,
			require('../lib/JSMongoQuery'),
			require('./TestQueries/MongoQueryTestQueries.json'));
	}
}(this, function(exports, JSMongoQuery, testQueries) {
	var queries = testQueries;
	if (!typeof queries === 'object') {
		queries = JSON.parse(testQueries);
	}

	describe("The JSMongoQuery performs query", function() {
		queries.forEach(function(q) {
			it(q.description, function() {
				expect(JSMongoQuery.executeQuery(q.query, q.document, q.options)).toBe(q.result);
			});
		});
	});
}));
