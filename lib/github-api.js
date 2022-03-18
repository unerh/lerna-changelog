"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const execa = require("execa");
const path = require("path");
const configuration_error_1 = require("./configuration-error");
const fetch_1 = require("./fetch");
class GithubAPI {
    constructor(config) {
        this.cacheDir = config.cacheDir && path.join(config.rootPath, config.cacheDir, "github");
        this.auth = this.getAuthToken();
        this.useCli = config.cli;
        if (!this.auth && !this.useCli) {
            throw new configuration_error_1.default("Must provide GITHUB_AUTH");
        }
        if (this.useCli && !this.getCliAuthToken()) {
            throw new configuration_error_1.default("Must provide GITHUB_TOKEN or GH_ENTERPRISE_TOKEN when using cli option");
        }
    }
    getBaseIssueUrl(repo) {
        if (this.useCli) {
            const baseUrl = execa.sync("gh", ["repo", "view", "--json", "url", "--jq", ".url"]).stdout;
            return `${baseUrl}/issues/`;
        }
        return `https://github.com/${repo}/issues/`;
    }
    getIssueData(repo, issue) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.useCli) {
                return this._ghApi(`repos/${repo}/issues/${issue}`);
            }
            return this._fetch(`https://api.github.com/repos/${repo}/issues/${issue}`);
        });
    }
    getUserData(login) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.useCli) {
                return this._ghApi(`users/${login}`);
            }
            return this._fetch(`https://api.github.com/users/${login}`);
        });
    }
    _ghApi(endpoint) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return JSON.parse((yield execa("gh", ["api", endpoint])).stdout);
            }
            catch (err) {
                throw new configuration_error_1.default(`cli error: ${err}`);
            }
        });
    }
    _fetch(url) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield (0, fetch_1.default)(url, {
                cachePath: this.cacheDir,
                headers: {
                    Authorization: `token ${this.auth}`,
                },
            });
            const parsedResponse = yield res.json();
            if (res.ok) {
                return parsedResponse;
            }
            throw new configuration_error_1.default(`Fetch error: ${res.statusText}.\n${JSON.stringify(parsedResponse)}`);
        });
    }
    getAuthToken() {
        return process.env.GITHUB_AUTH || "";
    }
    getCliAuthToken() {
        return process.env.GITHUB_TOKEN || process.env.GH_ENTERPRISE_TOKEN || "";
    }
}
exports.default = GithubAPI;
