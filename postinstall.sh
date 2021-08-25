#!/bin/bash

set -e
set -x

cp node_modules/vue/dist/vue.global.prod.js ./html

./node_modules/pug-cli/index.js ./html/
./node_modules/coffeescript/bin/coffee -c ./
./node_modules/typescript/bin/tsc --strict ./modules/*.ts

test -f ./config.json || cp ./config.example.json ./config.json
test -f ./tasks.json || echo "[]" > ./tasks.json
test -f ./templates/daily.md || cp ./templates/daily.example.md ./templates/daily.md
