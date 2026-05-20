import { readJsonFile } from "../shared";

export interface GithubSourceDecision {
  name: string;
  localPath: string;
  status: "accepted" | "rejected";
  reason: string;
  license: string | null;
  usageClass: "primary" | "secondary" | "github_verified" | "helper";
}

export async function getGithubSourceDecisions(): Promise<GithubSourceDecision[]> {
  return readJsonFile<GithubSourceDecision[]>("source-metadata", "github-sources.json");
}
