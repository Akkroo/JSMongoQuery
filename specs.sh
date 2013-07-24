#!/usr/bin/env bash

entry="node lib/jasmine-node/cli.js --noStack "

echo "Running all tests located in the spec directory"
command=$entry"spec"
echo $command
time $command #/nested/uber-nested