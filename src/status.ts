import { debug } from '@actions/core'
import { context } from '@actions/github'
import { v4 as uuidv4 } from 'uuid'
import { Octokit, State } from './types'
import { Config } from './config'
import { Util } from './util'

export namespace Status {
  export async function get(octokit: Octokit): Promise<State> {
    const pr = context.payload.pull_request!
    const body = pr.body as string
    const labels: string[] = pr.labels.map((label: any) => label.name)

    if (/@wip ready for review/i.test(body)) {
      return {
        wip: false,
        override: true,
      }
    }

    const { configs, manual } = await Config.get(octokit)

    let commitSubjects: string[] | null = null

    for (let i = 0; i < configs.length; i += 1) {
      const matchText = Util.getMatcher(configs[i].terms, configs[i].locations)
      let match = matchText('title', pr.title)
      if (match == null) {
        const matches = labels
          .map((label) => matchText('label', label))
          .filter((m) => m != null)
        match = matches[0]!
      }

      if (match == null) {
        if (commitSubjects == null) {
          // eslint-disable-next-line no-await-in-loop
          commitSubjects = (await Util.getCommitSubjects(octokit)) || []
        }

        if (commitSubjects.length) {
          const matches = commitSubjects
            .map((subject) => matchText('commit', subject))
            .filter((m) => m != null)
          match = matches[0]!
        }
      }

      if (match) {
        return {
          wip: true,
          configs,
          manual,
          ...match,
        }
      }
    }

    return {
      wip: false,
      configs,
      manual,
    }
  }

  const checkName = 'WIP'

  export async function hasChange(octokit: Octokit, nextState: State) {
    const { data } = await octokit.checks.listForRef({
      ...context.repo,
      ref: context.payload.pull_request!.head.sha,
      check_name: checkName,
    })

    const checkRuns = data.check_runs.filter(
      (item) =>
        item.external_id != null &&
        item.external_id.startsWith(`[${checkName}]`),
    )

    if (checkRuns.length === 0) {
      debug('No previous check runs.')
      return true
    }

    debug(`Found check runs: ${checkRuns.length}`)

    const [{ id, conclusion, external_id: externalId, output }] = checkRuns
    const isWip = conclusion !== 'success'
    const hasOverride = output != null && /override/.test(output.title)
    const preOverride = nextState.override === true

    debug(`Found check run: ${JSON.stringify({ conclusion, output })}`)

    nextState.checkRunId = id
    nextState.externalId = externalId

    return isWip !== nextState.wip || hasOverride !== preOverride
  }

  export async function update(octokit: Octokit, nextState: State) {
    const options: {
      name: string
      status?: string
      started_at?: string // eslint-disable-line
      completed_at?: string // eslint-disable-line
      conclusion?: string
    } = {
      name: checkName,
    }

    if (nextState.wip) {
      options.status = 'in_progress'
      options.started_at = new Date().toISOString()
    } else {
      options.status = 'completed'
      options.conclusion = 'success'
      options.completed_at = new Date().toISOString()
    }

    const output = Util.getOutput(nextState)

    debug(
      `${nextState.checkRunId != null ? 'update' : 'create'} check run with`,
    )
    debug(`  metadata: ${JSON.stringify(options)}`)
    debug(`  output: ${JSON.stringify(output)}`)

    const metadata = {
      ...context.repo,
      ...options,
      output,
      external_id: nextState.checkRunId || `[${checkName}]${uuidv4()}`,
      head_sha: context.payload.pull_request!.head.sha,

      // workaround for https://github.com/octokit/rest.js/issues/874
      head_branch: '',

      // workaround random "Bad Credentials" errors
      // https://github.community/t5/GitHub-API-Development-and/Random-401-errors-after-using-freshly-generated-installation/m-p/22905/highlight/true#M1596
      request: {
        retries: 3,
        retryAfter: 3,
      },
    }

    return nextState.checkRunId
      ? octokit.checks.update({
          ...metadata,
          check_run_id: nextState.checkRunId,
        })
      : octokit.checks.create(metadata)
  }
}
