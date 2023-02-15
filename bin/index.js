#!/usr/bin/env node

import {
  assignReviewers,
  getAffectedOwners,
  getAffectedTypes,
  getSupergraph,
} from "../src/index.js";

import { Command, Option, runExit } from "clipanion";

runExit(
  class MainCommand extends Command {
    name = Option.String("--name", { required: true });
    pull = Option.String("--pr", { required: true });
    schema = Option.String("--schema", { required: true });
    gitref = Option.String("--gitref", { required: true });
    graphref = Option.String("--graphref", { required: true });
    sudo = Option.Boolean("--sudo");

    async execute() {
      const apolloKey = process.env.APOLLO_KEY;
      const githubToken = process.env.GITHUB_TOKEN;
      const repo = process.env.GITHUB_REPOSITORY;

      if (!apolloKey) {
        this.context.stderr.write("Missing APOLLO_KEY\n");
        return 1;
      }

      if (!githubToken) {
        this.context.stderr.write("Missing GITHUB_TOKEN\n");
        return 1;
      }

      if (!repo) {
        this.context.stderr.write("Missing GITHUB_REPOSITORY\n");
        return 1;
      }

      const supergraph = await getSupergraph(this.graphref);
      const affectedTypes = await getAffectedTypes(this.schema, this.gitref);

      this.context.stdout.write(
        `AFFECTED TYPES\n${[...affectedTypes].join(", ")}`
      );

      const affectedOwners = getAffectedOwners(supergraph, affectedTypes);

      this.context.stdout.write(
        `AFFECTED OWNERS\n${[...affectedTypes].join(", ")}`
      );

      const response = await assignReviewers(repo, parseInt(this.pull, 10), [
        ...affectedOwners,
      ]);

      this.context.stdout.write(
        `GITHUB RESPONSE\n${JSON.stringify(response, null, 2)}`
      );
    }
  }
);
