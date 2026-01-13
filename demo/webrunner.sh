#!/bin/bash
# Title: Demo Batch Process
# Description: Simulates a long running process.
#
# @param TARGET_DATE date "Target Date"
# @param REGION select "Region" "US,EU,JP,Asia"
# @param VERBOSE boolean "Verbose Mode"
# @log build.log

echo "Starting process for date: $TARGET_DATE in region: $REGION" > build.log
echo "Verbose: $VERBOSE" >> build.log

for i in {1..5}; do
    echo "Processing step $i..." >> build.log
    sleep 1
done

echo "Process completed successfully!" >> build.log
echo "SUCCESS" >> build.log
