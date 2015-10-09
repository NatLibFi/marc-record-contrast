/**
 *
 * @licstart  The following is the entire license notice for the JavaScript code in this file. 
 *
 * Determine which record is higher-ranking in a MARC record pair
 *
 * Copyright (c) 2015 University Of Helsinki (The National Library Of Finland)
 *
 * This file is part of marc-record-rank
 *
 * marc-record-rank is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *  
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *  
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * @licend  The above is the entire license notice
 * for the JavaScript code in this file.
 *
 **/

/* istanbul ignore next: umd wrapper */
(function(root, factory) {

    'use strict';

    if (typeof define === 'function' && define.amd) {
	define(['jjv', 'jjve', './main', '../resources/configuration-schema.json'], factory);
    } else if (typeof module === 'object' && module.exports) {
	module.exports = factory(require('jjv'), require('jjve'), require('./main'), require('../resources/configuration-schema.json'));
    } else {
	root.createMarcRecordRanker = factory(root.jjv, root.jjve, root.createPreferredMarcSelector, root.MarcRecordRankerSchema);
    }

}(this, factory));

function factory(jjv, jjve, createPreferredMarcSelector, schema)
{

    'use strict';

    return function(configuration)
    {

	function validateConfiguration()
	{

	    var env = jjv();
	    var je = jjve(env);
	    var errors = env.validate(schema, configuration, {
		useDefault: true
	    });
	    
	    if (errors) {
		throw new Error(JSON.stringify(je(schema, configuration, errors), undefined, 4));
	    }

	}

	function getExtractors()
	{

	    function getExtractor(name)
	    {
		if (selector.extractors.hasOwnProperty(name)) {
		    return selector.extractors[name];
		} else {
		    throw new Error("Invalid extractor: '" + name + "'");
		}
	    }

	    return configuration.features.map(function(feature) {

		var extractor;

		if (typeof feature.extractor === 'string') {
		    extractor = getExtractor(feature.extractor);
		} else {

		    extractor = getExtractor(feature.extractor.name).apply(undefined, feature.extractor.parameters);

		    if (typeof extractor !== 'function') {
			throw new Error("Extractor '" + feature.extractor.name + "' doesn't expect parameters");
		    }

		}

		return extractor;

	    });

	}

	function getNormalizers()
	{
	    return configuration.features.map(function(feature) {

		if (selector.normalizers.hasOwnProperty(feature.normalizer)) {
		    return selector.normalizers[feature.normalizer];
		} else {
		    throw new Error("Invalid normalizer: '" + feature.normalizer + "'");
		}

	    });
	}

	var extractors, normalizers,
	selector = createPreferredMarcSelector();

	validateConfiguration();

	extractors = getExtractors();
	normalizers = getNormalizers();

	return function(record1, record2)
	{

	    function reduceFunc(prev, curr)
	    {
		return prev + curr;
	    }

	    var vector1 = selector.generateFeatureVector(record1, extractors);
	    var vector2 = selector.generateFeatureVector(record2, extractors);

	    selector.normalizeVectors(vector1, vector2, normalizers);

	    return vector1.reduce(reduceFunc, 0) - vector2.reduce(reduceFunc, 0);

	};

    };

}
