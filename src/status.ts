import { debug } from '@actions/core'
import { context } from '@actions/github'
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

    const checkRuns = data.check_runs
    if (checkRuns.length === 0) {
      debug('no previous check runs.')
      return true
    }

    const [{ conclusion, output }] = checkRuns
    const isWip = conclusion !== 'success'
    const hasOverride = output && /override/.test(output.title)

    debug(`last check run: ${JSON.stringify({ conclusion, output })}`)

    return isWip !== nextState.wip || hasOverride !== nextState.override
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

    return octokit.checks.create({
      ...context.repo,
      ...options,
      output: Util.getOutput(nextState),
      head_sha: context.payload.pull_request!.head.sha,

      // workaround for https://github.com/octokit/rest.js/issues/874
      head_branch: '',

      // workaround random "Bad Credentials" errors
      // https://github.community/t5/GitHub-API-Development-and/Random-401-errors-after-using-freshly-generated-installation/m-p/22905/highlight/true#M1596
      request: {
        retries: 3,
        retryAfter: 3,
      },
    })
  }
}
