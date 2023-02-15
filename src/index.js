import { GraphQLClient } from "graphql-request";
import { fetch } from "undici";
import { GetSupergraphDocument } from "./studio/graphql.js";
import { buildSchema } from "graphql";
import { diff } from "@graphql-inspector/core";
import { readFileSync } from "fs";
import { execa } from "execa";
import { getDirective } from "@graphql-tools/utils";
import { Octokit } from "@octokit/action";

/**
 * @param {string} graphRef
 */
export async function getSupergraph(graphRef) {
  const client = new GraphQLClient(
    "https://graphql.api.apollographql.com/api/graphql",
    {
      fetch,
      headers: {
        "x-api-key": process.env.APOLLO_KEY ?? "",
        ...(process.env.APOLLO_SUDO ? { "apollo-sudo": "true " } : {}),
      },
    }
  );

  const supergraphResp = await client.request(GetSupergraphDocument, {
    ref: graphRef,
  });

  /** @type {string} */
  const sdl =
    supergraphResp.variant?.__typename === "GraphVariant" &&
    supergraphResp.variant.latestApprovedLaunch?.build?.result?.__typename ===
      "BuildSuccess"
      ? supergraphResp.variant.latestApprovedLaunch.build.result.coreSchema
          .coreDocument
      : undefined;

  if (!sdl) {
    throw new Error(`Missing supergraph for ${graphRef}`);
  }

  return buildSchema(sdl);
}

/**
 * @param {string} file
 * @param {string} gitref
 */
export async function getAffectedTypes(file, gitref) {
  const current = readFileSync(file, "utf-8");
  const previous = (await execa("git", ["cat-file", "-p", `${gitref}:${file}`]))
    .stdout;

  console.log("-------- CURRENT ----------");
  console.log(current);
  console.log("-------- PREVIOUS ----------");
  console.log(previous);

  const result = await diff(
    buildSchema(previous, { assumeValidSDL: true }),
    buildSchema(current, { assumeValidSDL: true })
  );

  /** @type {Set<string>} */
  const affectedTypes = new Set();

  for (const diff of result) {
    if (diff.path) {
      affectedTypes.add(diff.path.split(".")[0]);
    }
  }

  return affectedTypes;
}

/**
 *
 * @param {import("graphql").GraphQLSchema} supergraphSchema
 * @param {Set<string>} affectedTypes
 */
export function getAffectedOwners(supergraphSchema, affectedTypes) {
  const affectedOwners = new Set();

  for (const typeName of affectedTypes) {
    const type = supergraphSchema.getType(typeName);
    if (!type) continue;

    const owner = getDirective(supergraphSchema, type, "owner")?.[0];
    if (owner) affectedOwners.add(owner.team);
  }

  return affectedOwners;
}

/**
 * @param {string} repoFullName
 * @param {number} pullNumber
 * @param {string[]} reviewers
 */
export async function assignReviewers(repoFullName, pullNumber, reviewers) {
  const octokit = new Octokit();

  const [owner, repo] = repoFullName.split("/");

  return octokit.pulls.requestReviewers({
    owner,
    repo,
    pull_number: pullNumber,
    // team_reviewers: reviewers,
    reviewers,
  });
}
