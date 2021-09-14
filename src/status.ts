import * as core from '@actions/core'
import * as github from '@actions/github'
import { v4 as uuid } from 'uuid'
import { Config } from './config'
import { Output } from './output'
import { Matcher } from './matcher'
import { Octokit } from './octokit'

export namespace Status {
  export interface State {
    wip: boolean
    override?: boolean
    configs?: Config[]
    manual?: boolean
    location?: Config.Location
    text?: string
    match?: string
  }

  const getCommitSubjects = async (octokit: Octokit) => {
    const { context } = github
    const { data: commits } = await octokit.rest.pulls.listCommits({
      ...context.repo,
      pull_number: context.payload.pull_request!.number,
    })

    return commits.map((e) => e.commit.message.split('\n')[0])
  }

  export async function get(octokit: Octokit): Promise<State> {
    const pr = github.context.payload.pull_request!
    const body = pr.body || ''
    const title = pr.title || ''

    if (/@wip ready for review/i.test(body)) {
      return {
        wip: false,
        override: true,
      }
    }

    const { configs, manual } = await Config.get()
    const checkCommit = configs.some((entry) =>
      entry.locations.some((loc) => loc === 'commit'),
    )

    const subjects = checkCommit ? await getCommitSubjects(octokit) : null
    const labels: string[] = pr.labels.map((label: any) => label.name)

    for (let i = 0, l = configs.length; i < l; i += 1) {
      const { locations, terms } = configs[i]
      const match = Matcher.generate(locations, terms)

      const result =
        match('title', title) ||
        match('label', labels) ||
        match('commit', subjects)

      if (result) {
        return {
          configs,
          manual,
          wip: true,
          ...result,
        }
      }
    }

    return {
      configs,
      manual,
      wip: false,
    }
  }

  const checkName = core.getInput('check_name') || 'WIP'

  export async function check(octokit: Octokit, nextState: State) {
    const { context } = github
    const { data } = await octokit.rest.checks.listForRef({
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
      core.debug('[wip] No previous check runs.')
      return true
    }

    core.debug(`[wip] Found check runs: ${checkRuns.length}`)

    const [{ conclusion, output }] = checkRuns
    const isWip = conclusion !== 'success'
    const hasOverride = output != null && /override/.test(output.title || '')
    const preOverride = nextState.override === true

    core.debug(
      `[wip] Found check run: ${JSON.stringify({ conclusion, output })}`,
    )

    return isWip !== nextState.wip || hasOverride !== preOverride
  }

  export async function update(octokit: Octokit, nextState: State) {
    const options: {
      name: string
      status?: 'in_progress' | 'completed' | 'queued'
      conclusion?:
        | 'success'
        | 'failure'
        | 'neutral'
        | 'cancelled'
        | 'skipped'
        | 'timed_out'
        | 'action_required'
      started_at?: string // eslint-disable-line camelcase
      completed_at?: string // eslint-disable-line camelcase
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

    const output = Output.get(nextState)

    core.debug(`[wip] Create check run.`)
    core.debug(`  metadata: ${JSON.stringify(options)}`)
    core.debug(`  output: ${JSON.stringify(output)}`)

    const { context } = github
    const metadata = {
      output,
      external_id: `[${checkName}]${uuid()}`,
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

    return octokit.rest.checks.create({
      ...context.repo,
      ...options,
      ...metadata,
    })
  }
}
