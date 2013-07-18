/* 
 * Copyright (C) 2013 Akkroo Solutions Ltd
 * 
 */

require(["requirejsconf.js"], function() {
	require(["domReady!", "jasmine", "jasmine-html", "spec/libs/JSMongoQuery.spec"], function( document, jasmine ){

		// Set up the HTML reporter - this is reponsible for
		// aggregating the results reported by Jasmine as the
		// tests and suites are executed.
		jasmine.getEnv().addReporter(
			new jasmine.HtmlReporter()
		);

		// Run all the loaded test specs.
		jasmine.getEnv().execute();

	});
});