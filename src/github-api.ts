const execa = require("execa");
const path = require("path");

import ConfigurationError from "./configuration-error";
import fetch from "./fetch";

export interface GitHubUserResponse {
  login: string;
  name: string;
  html_url: string;
}

export interface GitHubIssueResponse {
  number: number;
  title: string;
  pull_request?: {
    html_url: string;
  };
  labels: Array<{
    name: string;
  }>;
  user: {
    login: string;
    html_url: string;
  };
}

export interface Options {
  cli: boolean | undefined;
  repo: string;
  rootPath: string;
  cacheDir?: string;
}

export default class GithubAPI {
  private cacheDir: string | undefined;
  private auth: string;
  private useCli: boolean | undefined;

  constructor(config: Options) {
    this.cacheDir = config.cacheDir && path.join(config.rootPath, config.cacheDir, "github");
    this.auth = this.getAuthToken();
    this.useCli = config.cli;
    if (!this.auth && !this.useCli) {
      throw new ConfigurationError("Must provide GITHUB_AUTH");
    }
    if (this.useCli && !this.getCliAuthToken()) {
      throw new ConfigurationError("Must provide GITHUB_TOKEN or GH_ENTERPRISE_TOKEN when using cli option");
    }
  }

  public getBaseIssueUrl(repo: string): string {
    if (this.useCli) {
      const baseUrl = execa.sync("gh", ["repo", "view", "--json", "url", "--jq", ".url"]).stdout;
      return `${baseUrl}/issues/`;
    }
    return `https://github.com/${repo}/issues/`;
  }

  public async getIssueData(repo: string, issue: string): Promise<GitHubIssueResponse> {
    if (this.useCli) {
      return this._ghApi(`repos/${repo}/issues/${issue}`);
    }
    return this._fetch(`https://api.github.com/repos/${repo}/issues/${issue}`);
  }

  public async getUserData(login: string): Promise<GitHubUserResponse> {
    if (this.useCli) {
      return this._ghApi(`users/${login}`);
    }
    return this._fetch(`https://api.github.com/users/${login}`);
  }

  private async _ghApi(endpoint: string): Promise<any> {
    try {
      return JSON.parse((await execa("gh", ["api", endpoint])).stdout);
    } catch (err) {
      throw new ConfigurationError(`cli error: ${err}`);
    }
  }

  private async _fetch(url: string): Promise<any> {
    const res = await fetch(url, {
      cachePath: this.cacheDir,
      headers: {
        Authorization: `token ${this.auth}`,
      },
    });
    const parsedResponse = await res.json();
    if (res.ok) {
      return parsedResponse;
    }
    throw new ConfigurationError(`Fetch error: ${res.statusText}.\n${JSON.stringify(parsedResponse)}`);
  }

  private getAuthToken(): string {
    return process.env.GITHUB_AUTH || "";
  }

  private getCliAuthToken(): string {
    return process.env.GITHUB_TOKEN || process.env.GH_ENTERPRISE_TOKEN || "";
  }
}
