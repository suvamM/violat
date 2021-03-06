#!/usr/bin/env bash

FLAGSS=('' '--jit' '--weak' '--weak --min' '--weak --min --jit')
EXCLUDES=(SynchronousQueue PriorityBlockingQueue LinkedBlockingDeque LinkedTransferQueue LinkedBlockingQueue ConcurrentArrayBlockingQueue ConcurrentLinkedQueue ConcurrentLinkedDeque ConcurrentHashMap ConcurrentSkipListSet)

echo ---
echo Generating experimental data
echo ---

mkdir -p ./violat-output/histories
mkdir -p ./violat-output/results

if [[ -z $(find ./violat-output/histories -name "*.json") ]]
then
  for spec in $(find ./resources/specs -name "*.json")
  do
    if [[ ${EXCLUDES[@]} =~ $(basename $spec .json) ]]
    then
      echo ---
      echo Skipping $(basename $spec .json)
      echo ---
    else
      echo ---
      echo Collecting histories from $(basename $spec .json)
      echo ---
      violat-histories $spec
    fi
  done
else
  echo ---
  echo Refusing to interfere with existing traces
  echo ---
fi


if [[ -z $(find ./violat-output/results -name "*.json") ]]
then
  for run in $(find ./violat-output/histories -name "run-*")
  do
    echo ---
    echo Checking histories from $(basename $run)
    echo ---

    sample=$(find $run -name "*.json" | sort -R | head -n 1000)

    for flags in "${FLAGSS[@]}"
    do
      echo ---
      echo Running checker with flags: $flags
      echo ---
      echo $sample | xargs violat-history-checker $flags
    done
  done
else
  echo ---
  echo Refusing to interfere with existing results
  echo ---
fi
