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
		in_array = function(value, list) { return _.contains(list, value); },
		is_array = _.isArray,
		empty = _.isEmpty,
		is_callable = _.isFunction,
		is_bool = _.isBoolean,
		is_int = function(e) { return typeof n === 'number' && e % 1 == 0; },
		is_string = function(e) { return _.isString(e); },

		explode = function(sep, e) { return e.split(sep); },
		call_user_func = function(callback) {
			callback.apply(null, Array.prototype.slice.call(arguments, 1));
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
			if($logicalOperator !== '$and' && is_array($query) && !count($query))
				throw new Exception($logicalOperator+' requires nonempty array');
			if($options.debug && $options.logger) {
				$options.logger.debug('_executeQuery called', {query:$query, document:$document, options:$options, logicalOperator:$logicalOperator});
			}
			_.each($query, function($q, $k) {
				var $pass = true;
				if(is_string($k) && $k.substr(0, 1) === '$') {
					// key is an operator at this level, except $not, which can be at any level
					if ($k === '$not') {
						$pass = !JSMongoQuery._executeQuery($q, $document, $options);
					} else {
						$pass = JSMongoQuery._executeQuery($q, $document, $options, $k);
					}
				} else if($logicalOperator === '$and') { // special case for $and
					if(_.isObject($q)) { // $q is an object of query objects
						$pass = JSMongoQuery._executeQuery($q, $document, $options);
					} else if(is_array($q)) { // query is array, run all queries on field.  All queries must match. e.g { 'age': { $gt: 24, $lt: 52 } }
						$pass = JSMongoQuery._executeQueryOnElement($q, $k, $document, $options);
					} else {
						// key value means equality
						$pass = JSMongoQuery._executeOperatorOnElement('$e', $q, $k, $document, $options);
					}
				} else { // $q is array of query objects e.g '$or' => [{'fullName' => 'Nick'}]
					$pass = JSMongoQuery._executeQuery($q, $document, $options, '$and');
				}
				switch($logicalOperator) {
					case '$and': // if any fail, query fails
						if(!$pass) return false;
						break;
					case '$or': // if one succeeds, query succeeds
						if($pass) return true;
						break;
					case '$nor': // if one succeeds, query fails
						if($pass) return false;
						break;
					default:
						if($options.logger) {
							$options.logger.warning('_executeQuery could not find logical operator', {query : $query, document : $document, logicalOperator : $logicalOperator});
						}
						return false;
				}
			});
			
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
			if($options.debug && $options.logger) {
				$options.logger.debug('executeQueryOnElement called', {query : $query, element : $element, document : $document, options : $options});
			}
			// iterate through query operators
			return _.every($query, function($opVal, $op) {
				return JSMongoQuery._executeOperatorOnElement($op, $opVal, $element, $document);
			});
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
			if($options.debug && $options.logger) {
				$options.logger.debug('executeOperatorOnElement called', {operatorValue : $operatorValue, element : $element, document : $document, options : $options});
			}

			if($operator === '$not') {
				return !JSMongoQuery._executeQueryOnElement($operatorValue, $element, $document);
			}

			var $elementSpecifier = explode('.',$element),
				$v = $document,
				$exists = true;
			_.every($elementSpecifier, function($es) {
				if($v[$es] !== undefined)
					$v = $v[$es];
				else {
					$exists = false;
					return false;
				}
			});

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
				case '$e':
					if(!$exists) return false;
					if(is_array($v)) return in_array($operatorValue, $v);
					return _.isEqual($operatorValue, $v);
				case '$in':
					if(!$exists) return false;
					if(is_array($operatorValue)) throw new Exception('$in requires array');
					if(count($operatorValue) === 0) return false;
					return in_array($v, $operatorValue);
				case '$lt':		return $exists && $v < $operatorValue;
				case '$lte':	return $exists && $v <= $operatorValue;
				case '$gt':		return $exists && $v > $operatorValue;
				case '$gte':	return $exists && $v >= $operatorValue;
				case '$ne':		return (!$exists && $operatorValue === null) || ($exists && $v !== $operatorValue);
				case '$nin':
					if(!$exists) return true;
					if(!is_array($operatorValue)) throw new Exception('$nin requires array');
					if(count($operatorValue) === 0) return true;
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
				else if(is_int($k) || $k.charAt(0) === '$') return;
				$fields.push($k);
			});
			return array_unique($fields);
		}
		
	};
	
	_.extend(exports, JSMongoQuery);
}));