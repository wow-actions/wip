import * as core from '@actions/core'
import * as github from '@actions/github'
import { Octokit } from './octokit'

export namespace Util {
  export function getOctokit() {
    const token = core.getInput('GITHUB_TOKEN', { required: true })
    return github.getOctokit(token)
  }

  export async function getCommitSubjects(octokit: Octokit) {
    const { context } = github
    const { data: commits } = await octokit.rest.pulls.listCommits({
      ...context.repo,
      pull_number: context.payload.pull_request!.number,
    })

    return commits.map((e) => e.commit.message.split('\n')[0])
  }

  const presets = ['do-not-merge', 'work in progress', 'wip', 'rfc', '🚧']
  const separator = /\s?[,\n\r]\s?/

  export function getBlockingLabels() {
    const labels = core
      .getInput('labels')
      .split(separator)
      .map((label) => label.trim().toLowerCase())
      .filter((label) => label.length > 0)
    return labels.length > 0 ? labels : [...presets]
  }

  export function getBlockingKeywords() {
    const keywords = core
      .getInput('keywords')
      .split(separator)
      .map((keyword) => keyword.trim().toLowerCase())
      .filter((keyword) => keyword.length > 0)
    return keywords.length > 0 ? keywords : [...presets]
  }

  export function getWIPDescription() {
    return core.getInput('wip_description') || 'work in progress'
  }

  export function getReadyDescription() {
    return core.getInput('ready_description') || 'ready for review'
  }

  export function getContect() {
    return core.getInput('context') || 'WIP'
  }

  export function getTargetUrl() {
    const url = core.getInput('target_url') || ''
    return url.length ? url : undefined
  }
}
