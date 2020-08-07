#!/bin/bash

#Setup
echo "installing express"
npm install express

echo "installing dotenv"
npm install dotenv

echo "installing airtable"
npm install airtable

echo "installing request"
npm install request

echo "creating .env"
FILE=".env"
/bin/cat <<EOM >$FILE
AIRTABLE_API_KEY=

AIRTABLE_BASE_ID=

CLICKATELL_API_KEY=

CLICKATELL_LONG_NUMBER=
EOM

echo "creating app.yaml"
FILE="app.yaml"
/bin/cat <<EOM >$FILE
runtime: nodejs
env: flex

env_variables:
  AIRTABLE_API_KEY: ""
  AIRTABLE_BASE_ID: ""
  CLICKATELL_API_KEY: ""
  CLICKATELL_LONG_NUMBER: ""
EOM

echo "finished"