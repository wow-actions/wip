import * as core from '@actions/core'
import * as github from '@actions/github'
import { Octokit } from './octokit'
import { Status } from './status'

export namespace Action {
  export async function run() {
    const payload = github.context.payload.pull_request
    const action = github.context.payload.action!
    const actions = ['opened', 'edited', 'labeled', 'unlabeled', 'synchronize']

    if (payload && action && actions.includes(action)) {
      try {
        const octokit = Octokit.get()
        const nextState = await Status.get(octokit)
        core.debug(`[wip] Next status: ${JSON.stringify(nextState)}`)
        const changed = await Status.check(octokit, nextState)

        if (changed) {
          await Status.update(octokit, nextState)
          core.debug(`[wip] Status changed`)
          core.debug(
            nextState.wip ? '[wip] work in progress' : '[wip] ready for review',
          )
        } else {
          core.debug('[wip] Status not changed')
        }
      } catch (e) {
        core.error(e)
        core.setFailed(e.message)
      }
    }
  }
}
