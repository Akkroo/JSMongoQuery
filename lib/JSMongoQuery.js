/* 
 * Copyright (C) 2013 Akkroo Solutions Ltd
 * 
 */

(function (root, factory) {
    if (typeof exports === 'object') {
        // CommonJS
        factory(exports, require('underscore'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['exports', 'underscore'], factory);
    } else {
        // Browser globals
        factory((root.JSMongoQuery = {}), root._);
    }
}(this, function (exports, _, undefined) {
	
	// PHP shims.  Most are just renamed underscore functions.
	var count = _.size,
		array_intersect = _.intersection,
		array_unique = _.uniq,
		
		empty = _.isEmpty,
		is_callable = _.isFunction,
		is_array = _.isArray,
		is_bool = _.isBoolean,
		is_string = _.isString,
		is_int = function(n) { return _.isNumber(n) && n % 1 == 0; },
		in_array = function(needle, haystack) { return _.contains(haystack, needle); },
		array_diff = function(a1, a2){ return _.difference(a2, a1); },
		array_slice = function(a, offset, length) { return a.slice(offset, length === undefined ? undefined : offset + length); },
		substr = function(string, start, length) { string.substr(start, length); },
		explode = function(sep, e) { return e.split(sep); },
		implode = function(sep, e) { return e.join(sep); },
		call_user_func = function(callback) {
			return callback.apply(null, Array.prototype.slice.call(arguments, 1));
		},
		array_merge = function(a1,a2) { return a1.concat(a2); };
	// recreate 
	var Exception = function(e, code, previous) {
		this.exception = e;
		this.code = code;
		this.previous = previous;
		this.toString = function(){return e;}
	};
	
	JSMongoQuery = {
		/**
		 * Execute a Mongo query on a document
		 * 
		 * @param $query		A boolean value or an array defining a query
		 * @param $document	The document to query
		 * @param $options	Any options:
		 *	'unknownOperatorCallback' - a callback to be called if an operator can't be found.  The function definition is function(operator, operatorValue, field, document). return true or false. 
		 * @return boolean
		 * @throws Exception
		 */
		executeQuery: function executeQuery($query, $document, $options) {
			$options = $options || {};
			if($options.debug && $options.logger) {
				$options.logger.debug('executeQuery called', {query : $query, document : $document, options : $options});
			}
			
			if(!_.isObject($query)) return !!$query;
			if(!_.isObject($document)) throw new Exception("document should be an object");

			return JSMongoQuery._executeQuery($query, $document, $options);
		},
		
		/**
		 * Internal execute query
		 * 
		 * This expects an array from the query and has an additional logical operator (for the root query object the logical operator is always $and so this is not required)
		 * 
		 * @param $query			The query array
		 * @param $document			The document array to query
		 * @param $options			Options array
		 * @param $logicalOperator	Operator string
		 * @return boolean
		 * @throws Exception
		 */
		_executeQuery: function _executeQuery($query, $document, $options, $logicalOperator) {
			if(!$logicalOperator) {
				$logicalOperator = '$and';
			}
			if($logicalOperator !== '$and' && !count($query))
				throw new Exception($logicalOperator+' requires nonempty array');
			if($options.debug && $options.logger) {
				$options.logger.debug('_executeQuery called', {query:$query, document:$document, options:$options, logicalOperator:$logicalOperator});
			}
			var $pass, result = null;
			// use for to enable returning inside loop
			_.every($query, function($q, $k) {
				$pass = true;
				if(is_string($k) && substr($k, 0, 1) === '$') {
					// key is an operator at this level, except $not, which can be at any level
					if($k === '$not')
						$pass = !JSMongoQuery._executeQuery($q, $document, $options);
					else
						$pass = JSMongoQuery._executeQuery($q, $document, $options, $k);
				} else if($logicalOperator === '$and') { // special case for $and
					if(is_int($k)) { // $q is an object of query objects
						$pass = JSMongoQuery._executeQuery($q, $document, $options);
					} else if(_.isObject($q)) { // query is array, run all queries on field.  All queries must match. e.g { 'age': { $gt: 24, $lt: 52 } }
						$pass = JSMongoQuery._executeQueryOnElement($q, $k, $document, $options);
					} else {
						// key value means equality
						$pass = JSMongoQuery._executeOperatorOnElement('$e', $q, $k, $document, $options);
					}
				} else { // $q is array of query objects e.g '$or' => [{'fullName' => 'Nick'}]
					$pass = JSMongoQuery._executeQuery($q, $document, $options, '$and');
				}
				
				if ($options.debug && $options.logger) {
					$options.logger.debug('_executeQuery executed query part',
					{query : $q, result: $pass, document : $document, logicalOperator : $logicalOperator});
				}
				
				switch($logicalOperator) {
					case '$and': // if any fail, query fails
						if(!$pass) { result = false; return false; }
						break;
					case '$or': // if one succeeds, query succeeds
						if($pass) { result = true; return false; }
						break;
					case '$nor': // if one succeeds, query fails
						if($pass) { result = false; return false; }
						break;
					default:
						if ($options.logger) {
							$options.logger.warning('_executeQuery could not find logical operator',
							{query : $query, document : $document, logicalOperator : $logicalOperator});
						}
						result = false;
						return false;
				}
				return true;
			});
			
			// Will be set if we exited the loop early, so we should use it as the
			// return value for the function.
			if (result !== null) {
				return result;
			}
			
			switch($logicalOperator) {
				case '$and': // all succeeded, query succeeds
					return true;
				case '$or': // all failed, query fails
					return false;
				case '$nor': // all failed, query succeeded
					return true;
				default:
					if($options.logger) {
						$options.logger.warning('_executeQuery could not find logical operator', {query : $query, document : $document, logicalOperator : $logicalOperator});
					}
					return false;
			}
			throw new Exception('Reached end of _executeQuery without returning a value');
		},
		
		/**
		 * Execute a query object on an element
		 * 
		 * @param $query
		 * @param $field
		 * @param $document
		 * @return boolean
		 * @throws Exception
		 */
		_executeQueryOnElement: function _executeQueryOnElement($query, $element, $document, $options) {
			if($options && $options.debug && $options.logger) {
				$options.logger.debug('_executeQueryOnElement called', {query : $query, element : $element, document : $document, options : $options});
			}
			// iterate through query operators
			return _.every($query, function($opVal, $op) {
				return JSMongoQuery._executeOperatorOnElement($op, $opVal, $element, $document, $options);
			});
		},
		
		/**
		* Check if an operator is equal to a value
		* 
		* Equality includes direct equality, regular expression match, and checking if the operator value is one of the values in an array value
		* 
		* @param $v
		* @param $operatorValue
		* @return boolean
		*/
		_isEqual: function isEqual($v, $operatorValue) {
			if(is_array($v)) return in_array($operatorValue, $v);
			var $matches;
			if(is_string($operatorValue) && ($matches = $operatorValue.match(/^\/(.*?)\/([a-z]*)$/i)))
				return (new RegExp($matches[1], $matches[2])).test($v);
			return _.isEqual($operatorValue, $v);
		},

		/**
		 * Execute a Mongo Operator on an element
		 * 
		 * @param $operator		The operator to perform
		 * @param $operatorValue	The value to provide the operator
		 * @param $element		The target element.  Can be an object path eg price.shoes
		 * @param $document		The document in which to find the element
		 * @param $options		Options
		 * @return boolean				The result
		 * @throws Exception			Exceptions on invalid operators, invalid unknown operator callback, and invalid operator values
		 */
		_executeOperatorOnElement: function _executeOperatorOnElement($operator, $operatorValue, $element, $document, $options) {
			if($options && $options.debug && $options.logger) {
				$options.logger.debug('_executeOperatorOnElement called', {operatorValue : $operatorValue, element : $element, document : $document, options : $options});
			}

			if($operator === '$not') {
				return !JSMongoQuery._executeQueryOnElement($operatorValue, $element, $document, $options);
			}

			var $elementSpecifier = explode('.',$element),
				$v = $document,
				$exists = true,
				$result = null;
			_.every($elementSpecifier, function($es, $index) {
				if(empty($v)) {
					$exists = false;
					return false;
				}
				if(_.isArray($v)) {
					// value from document is an array, so we need to iterate through array and test the query on all elements of the array
					// if any elements match, then return true
					var $newSpecifier = implode('.', array_slice($elementSpecifier, $index));
					$result = _.some($v, function($item) {
						return JSMongoQuery._executeOperatorOnElement($operator, $operatorValue, $newSpecifier, $item, $options);
					});
					return false;
				}
				if($v[$es] === undefined) {
					$exists = false;
					return false;
				}
				$v = $v[$es];
				return true;
			});
			
			if($result !== null) {
				return $result;
			}

			switch($operator) {
				case '$all':
					if(!$exists) return false;
					if(!is_array($operatorValue)) throw '$all requires array';
					if(count($operatorValue) === 0) return false;
					if(!is_array($v)) {
						if(count($operatorValue) === 1)
							return $v === $operatorValue[0];
						return false;
					}
					return count(array_intersect($v, $operatorValue)) === count($operatorValue);
				case '$e': // non-mongo operator to allow same method call
					if(!$exists) return false;
					return JSMongoQuery._isEqual($v, $operatorValue);
				case '$in':
					if(!$exists) return false;
					if(!is_array($operatorValue)) throw new Exception('$in requires array');
					if(count($operatorValue) === 0) return false;
					if(is_array($v)) return count(array_diff($v, $operatorValue)) < count($operatorValue);
					return in_array($v, $operatorValue);
				case '$lt':		return $exists && $v < $operatorValue;
				case '$lte':	return $exists && $v <= $operatorValue;
				case '$gt':		return $exists && $v > $operatorValue;
				case '$gte':	return $exists && $v >= $operatorValue;
				case '$ne':		return (!$exists && $operatorValue !== null) || ($exists && !JSMongoQuery._isEqual($v, $operatorValue));
				case '$nin':
					if(!$exists) return true;
					if(!is_array($operatorValue)) throw new Exception('$nin requires array');
					if(count($operatorValue) === 0) return true;
					if(is_array($v)) {
						return !(count(array_diff($v, $operatorValue)) < count($operatorValue));
					}
					return !in_array($v, $operatorValue);

				case '$exists':	return ($operatorValue && $exists) || (!$operatorValue && !$exists);
				case '$mod':
					if(!$exists) return false;
					if(!is_array($operatorValue)) throw new Exception('$mod requires array');
					if(count($operatorValue) !== 2) throw new Exception('$mod requires two parameters in array: divisor and remainder');
					return $v % $operatorValue[0] === $operatorValue[1];

				default:
					if(empty($options['unknownOperatorCallback']) || !is_callable($options['unknownOperatorCallback']))
						throw new Exception('Operator '+$operator+' is unknown');

					var $res = call_user_func($options['unknownOperatorCallback'], $operator, $operatorValue, $element, $document);
					if($res === null)
						throw new Exception('Operator '+$operator+' is unknown');
					if(!is_bool($res))
						throw new Exception('Return value of unknownOperatorCallback must be boolean, actual value '.$res);
					return $res;
			}
			throw new Exception('Didn\'t return in switch');
		},

		/**
		 * Iterate through the query looking for field identifiers.  Append $append to the end of the identifier.
		 * 
		 * @param $query
		 * @param $append
		 * @return	The new query
		 */
		appendFieldSpecifier: function appendFieldSpecifier($query, $append) {
			_.each($query, function($v, $k) {
				if(is_array($v))
					$query[$k] = JSMongoQuery.appendFieldSpecifier($v, $append);
				if(is_int($k) || $k[0] === '$') return;
				$query[$k+'.'+$append] = $v;
				delete $query[$k];
			});
			return $query;
		},
		
		/**
		 * Get the fields this query depends on
		 * 
		 * @param $query	The query to analyse
		 * @return array	An array of fields this query depends on
		 */
		getDependentFields: function getDependentFields($query) {
			var $fields = [];
			_.each($query, function($v, $k) {
				if(is_array($v))
					$fields = array_merge($fields, JSMongoQuery.getDependentFields($v));
				if(is_int($k) || $k.charAt(0) === '$') return;
				$fields.push($k);
			});
			return array_unique($fields);
		}
		
	};
	
	_.extend(exports, JSMongoQuery);
}));