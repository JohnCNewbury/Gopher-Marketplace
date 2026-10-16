#!/bin/zsh
# Wait until CodePipeline has Succeeded for merge commit $1 (a prefix) and EB is Ready/Green on it.
SHA=$1
for i in $(seq 1 60); do
  ex=$(aws codepipeline list-pipeline-executions --pipeline-name gopher-prod-codepipeline --max-items 3 --query 'pipelineExecutionSummaries[].[sourceRevisions[0].revisionId,status,pipelineExecutionId]' --output text 2>/dev/null | grep "^$SHA" | head -1)
  st=$(echo "$ex" | awk '{print $2}')
  env=$(aws elasticbeanstalk describe-environments --environment-names Gopher-Production --query 'Environments[0].[Status,Health,VersionLabel]' --output text 2>/dev/null)
  case "$st" in Failed|Stopped|Superseded) echo "PIPELINE $st at $(date '+%H:%M:%S')"; echo "$ex"; echo "$env"; exit 1;; esac
  if [ "$st" = Succeeded ] && echo "$env" | grep -q "Ready	Green.*$SHA"; then echo "LIVE at $(date '+%H:%M:%S %Z'): $ex"; echo "EB: $env"; exit 0; fi
  [ $((i % 6)) -eq 0 ] && echo "$(date '+%H:%M:%S') pipeline=${st:-not-started} eb=$(echo $env | cut -c1-40)"
  sleep 20
done; echo TIMEOUT; echo "$env"; exit 2
