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
      const newStatus = await Status.get(octokit)
      const hasChange = await Status.hasChange(octokit, newStatus)
      if (hasChange) {
        await Status.update(octokit, newStatus)
        core.info(newStatus.wip ? 'work in progress' : 'ready for review')
      } else {
        core.info('status not changed')
      }
    }
  } catch (e) {
    core.error(e)
    core.setFailed(e.message)
  }
}

start()
