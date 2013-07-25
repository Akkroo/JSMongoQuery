/* 
 * Copyright (C) 2013 Akkroo Solutions Ltd
 * 
 */

requirejs.config({
	paths: {
		"app":"../../app/resources/js",
		"domReady": "../../app/resources/js/libs/require/domReady",
		"text": "../../app/resources/js/libs/require/text",
		"underscore": "../../app/resources/js/libs/underscore",
		"jasmine": "jasmine-1.3.1/jasmine",
		"jasmine-html": "jasmine-1.3.1/jasmine-html"
	},
	shim: {
		"underscore": {
			exports: "_"
		},
		"jasmine": {
			exports: 'jasmine'
		},
		"jasmine-html": ['jasmine']
	}
});