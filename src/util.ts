import * as core from '@actions/core'
import * as github from '@actions/github'

export namespace Util {
  export function getOctokit() {
    const token = core.getInput('GITHUB_TOKEN', { required: true })
    return github.getOctokit(token)
  }

  const presets = ['do-not-merge', 'work in progress', 'wip', 'rfc', '🚧']

  export function getBlockingLabels() {
    const raw = core.getInput('labels') || ''
    const labels = raw
      .split(/\s?,\s?/)
      .map((label) => label.trim().toLowerCase())
    return labels.length ? labels : presets
  }

  export function getBlockingKeywords() {
    const raw = core.getInput('keywords') || ''
    const keywords = raw
      .split(/\s?[,\n\r]\s?/)
      .map((keyword) => keyword.trim().toLowerCase())
    return keywords.length ? keywords : presets
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
