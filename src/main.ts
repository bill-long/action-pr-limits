import * as core from '@actions/core';
import * as github from '@actions/github';
import {PullRequestEvent} from '@octokit/webhooks-types';
import {ListResult, listContains} from './check';

function handlePullRequest(allowedBranches: string[], forbiddenBranches: string[]): void {
    if (allowedBranches.length > 0 && forbiddenBranches.length > 0) {
        core.warning(
            "You should either specify a allowlist or a denylist, not both at the same time. " +
            "The allowlist will be used."
        );
    } else if (allowedBranches.length == 0 && forbiddenBranches.length == 0) {
        core.warning("Both the allowlist and the denylist are empty.");
        return;
    }

    let pullRequestEvent = github.context.payload as PullRequestEvent;

    const headLabel = pullRequestEvent.pull_request.head.label.toLowerCase(); // source
    const baseLabel = pullRequestEvent.pull_request.base.label.toLowerCase(); // target

    core.info(`Pull request #${pullRequestEvent.number}: ${headLabel} -> ${baseLabel}`);
    core.info(`Allowed Branches: ${JSON.stringify(allowedBranches)}`);
    core.info(`Forbidden Branches: ${JSON.stringify(forbiddenBranches)}`);

    const allowDecision = listContains(headLabel, allowedBranches);
    const denyDecision = listContains(headLabel, forbiddenBranches);

    if (allowDecision == ListResult.ON_LIST) {
        core.info(`The pull request is allowed. Branch '${headLabel}' has been found on the allowlist.`);
    } else if (allowDecision == ListResult.NOT_ON_LIST) {
        core.setFailed(
            `The pull request is forbidden. ` +
            `Branch '${headLabel}' hasn't been found on the allowlist for '${baseLabel}'.`
        );
    } else if (denyDecision == ListResult.ON_LIST) {
        core.setFailed(
            `The pull request is forbidden. ` +
            `Branch '${headLabel}' has been found on the denylist for '${baseLabel}'.`
        );
    } else if (denyDecision == ListResult.NOT_ON_LIST) {
        core.info(`The pull request is allowed. Branch '${headLabel}' hasn't been found on the denylist.`);
    }
}

function getInputs(name: string): string[] {
    const input = core.getInput(name);

    return !input ? [] : input
        .split('\n')
        .filter(str => str !== '')
        .map(str => str.toLowerCase());
}

function main(): void {
    if (github.context.eventName !== "pull_request") {
        core.warning(`This action should only run, when the event is a pull request, ` +
            `but it's a ${github.context.eventName}`);
        return;
    }

    const allowedBranches = getInputs('allowlist').concat(getInputs('whitelist'));
    const forbiddenBranches = getInputs('denylist').concat(getInputs('blacklist'));
    handlePullRequest(allowedBranches, forbiddenBranches);
}

main();
