#!/bin/bash
# Stop existing processes
fuser -k 3000/tcp
fuser -k 3001/tcp

cd /home/ubuntu/timetable
# Start processes
nohup npm run start > next.log 2>&1 &
nohup node realtime-server.mjs > realtime.log 2>&1 &
echo "Processes started in background."
