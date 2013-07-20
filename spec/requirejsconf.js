/*
 * Copyright (C) 2013 Akkroo Solutions Ltd
 *
 */

requirejs.config({
	paths: {
		"domReady": "./vendor/require/domReady",
		"text": "./vendor/require/text",
		"underscore": "./vendor/underscore",
		"jasmine": "./vendor/jasmine-1.3.1/jasmine",
		"jasmine-html": "./vendor/jasmine-1.3.1/jasmine-html"
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
