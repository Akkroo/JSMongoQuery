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
	
	var logger = {
		debug: function(e,p) { console.log(e); console.log(p); },
		warning: function(e,p) { console.warn(e); console.warn(p); },
		error: function(e,p) { console.error(e); console.error(p); }
	};

	describe("The JSMongoQuery performs query", function() {
		queries.forEach(function(q) {
			it(q.description, function() {
				// uncomment for debugging
//				q.options.logger = logger;
//				q.options.debug = true;
				expect(JSMongoQuery.executeQuery(q.query, q.document, q.options)).toBe(q.result);
			});
		});
	});
}));
