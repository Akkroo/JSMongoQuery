#!/usr/bin/env bash
prefix="node "

if [ "$1" = "--debug" ]
then
	echo "Running with node-inspector"
	node node_modules/node-inspector/bin/inspector.js &
	prefix="node --debug-brk "
fi

command=$prefix"node_modules/jasmine-node/lib/jasmine-node/cli.js --noStack spec"
echo "Running all tests located in the spec directory"
echo $command
time $command #/nested/uber-nested
