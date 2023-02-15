```
rover subgraph publish $APOLLO_GRAPH_REF --name subgraph-a --schema schema.graphql --routing-url http://subgraph-a
```

```
export GITHUB_TOKEN=
export APOLLO_KEY=
export GITHUB_REPOSITORY=lennyburdette/cuddly-palm-tree
node ./bin/index.js \
  --name subgraph-a \
  --pr 1 \
  --schema schema.graphql \
  --gitref main \
  --graphref lenny-federation2@owner-demo
```
