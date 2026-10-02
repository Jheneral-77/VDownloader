#!/bin/bash

cd bgutil-ytdlp-pot-provider/server
node build/main.js &

sleep 2

cd ../..
exec gunicorn app:app --bind 0.0.0.0:$PORT --no-sendfile
