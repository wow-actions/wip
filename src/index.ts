import * as core from '@actions/core'
import * as github from '@actions/github'
import { Status } from './status'
import { Util } from './util'

async function start() {
  try {
    const { context } = github
    const { action, pull_request: payload } = context.payload

    const actions = ['opened', 'edited', 'labeled', 'unlabeled', 'synchronize']

    if (payload && action && actions.includes(action)) {
      const octokit = Util.getOctokit()
      const nextState = await Status.get(octokit)
      core.debug(`status: ${JSON.stringify(nextState)}`)
      const hasChange = await Status.hasChange(octokit, nextState)
      core.debug(`status changed: ${hasChange}`)
      if (hasChange) {
        await Status.update(octokit, nextState)
        core.info(nextState.wip ? 'work in progress' : 'ready for review')
      } else {
        if (nextState.checkRunId != null) {
          await octokit.checks.update({
            ...context.repo,
            check_run_id: nextState.checkRunId,
          })
        }
        core.info('status not changed')
      }
    }
  } catch (e) {
    core.error(e)
    core.setFailed(e.message)
  }
}

start()
