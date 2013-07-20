define(
	[
	"../lib/JSMongoQuery",
	"text!../tests/TestQueries/MongoQueryTestQueries.json"
	],
	function( JSMongoQuery, testQueries ){
		var queries = JSON.parse(testQueries);

		// Describe the test suite for this module.
		describe(
			"The JSMongoQuery performs query",
			function(){
				queries.forEach(function(q) {
					it(
						q.description,
						function() {
							expect(JSMongoQuery.executeQuery(q.query, q.document, q.options)).toBe(q.result);
						}
					);
				});
			}
		);
	}
);
