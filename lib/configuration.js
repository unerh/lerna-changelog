"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findRepoFromPkg = exports.fromPath = exports.load = void 0;
const fs = require("fs");
const path = require("path");
const execa = require("execa");
const hostedGitInfo = require("hosted-git-info");
const configuration_error_1 = require("./configuration-error");
const git_1 = require("./git");
function load(options = {}) {
    let rootPath = (0, git_1.getRootPath)();
    return fromPath(rootPath, options);
}
exports.load = load;
function fromPath(rootPath, options = {}) {
    let config = fromPackageConfig(rootPath) || fromLernaConfig(rootPath) || {};
    if (options.repo) {
        config.repo = options.repo;
    }
    if (options.cli) {
        config.cli = options.cli;
    }
    let { cli, repo, nextVersion, labels, cacheDir, ignoreCommitters } = config;
    if (!repo) {
        repo = findRepo(rootPath, config);
        if (!repo) {
            throw new configuration_error_1.default('Could not infer "repo" from the "package.json" file.');
        }
    }
    if (options.nextVersionFromMetadata || config.nextVersionFromMetadata) {
        nextVersion = findNextVersion(rootPath);
        if (!nextVersion) {
            throw new configuration_error_1.default('Could not infer "nextVersion" from the "package.json" file.');
        }
    }
    if (!labels) {
        labels = {
            breaking: ":boom: Breaking Change",
            enhancement: ":rocket: Enhancement",
            bug: ":bug: Bug Fix",
            documentation: ":memo: Documentation",
            internal: ":house: Internal",
        };
    }
    if (!ignoreCommitters) {
        ignoreCommitters = [
            "dependabot-bot",
            "dependabot[bot]",
            "dependabot-preview[bot]",
            "greenkeeperio-bot",
            "greenkeeper[bot]",
            "renovate-bot",
            "renovate[bot]",
        ];
    }
    return {
        cli,
        repo,
        nextVersion,
        rootPath,
        labels,
        ignoreCommitters,
        cacheDir,
    };
}
exports.fromPath = fromPath;
function fromLernaConfig(rootPath) {
    const lernaPath = path.join(rootPath, "lerna.json");
    if (fs.existsSync(lernaPath)) {
        return JSON.parse(fs.readFileSync(lernaPath)).changelog;
    }
}
function fromPackageConfig(rootPath) {
    const pkgPath = path.join(rootPath, "package.json");
    if (fs.existsSync(pkgPath)) {
        return JSON.parse(fs.readFileSync(pkgPath)).changelog;
    }
}
function findRepo(rootPath, config) {
    const pkgPath = path.join(rootPath, "package.json");
    if (!fs.existsSync(pkgPath)) {
        return;
    }
    const pkg = JSON.parse(fs.readFileSync(pkgPath));
    if (!pkg.repository) {
        return;
    }
    return findRepoFromPkg(pkg, config);
}
function findNextVersion(rootPath) {
    const pkgPath = path.join(rootPath, "package.json");
    const lernaPath = path.join(rootPath, "lerna.json");
    const pkg = fs.existsSync(pkgPath) ? JSON.parse(fs.readFileSync(pkgPath)) : {};
    const lerna = fs.existsSync(lernaPath) ? JSON.parse(fs.readFileSync(lernaPath)) : {};
    return pkg.version ? `v${pkg.version}` : lerna.version ? `v${lerna.version}` : undefined;
}
function findRepoFromPkg(pkg, config) {
    const url = pkg.repository.url || pkg.repository;
    if (config === null || config === void 0 ? void 0 : config.cli) {
        return execa.sync("gh", ["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"]).stdout;
    }
    const info = hostedGitInfo.fromUrl(url);
    if (info && info.type === "github") {
        return `${info.user}/${info.project}`;
    }
}
exports.findRepoFromPkg = findRepoFromPkg;
