import { context } from '@actions/github'
import emojiToName from '../node_modules/gemoji/emoji-to-name.json'
import { Config } from './config'
import { Octokit } from './types'
import { Util } from './util'

export interface Status {
  wip: boolean
  configs?: Config.Item[]
  custom?: boolean
  override?: boolean
  location?: Config.Location
  text?: string
  match?: string
}

export namespace Status {
  const getMatcher = (terms: string[], locations: Config.Location[]) => (
    location: Config.Location,
    text: string,
  ) => {
    if (!locations.includes(location)) {
      return null
    }

    const match = Util.matchTerms(terms, text)
    return match ? { location, text, match } : null
  }

  export async function get(octokit: Octokit): Promise<Status> {
    const pr = context.payload.pull_request!
    const body = pr.body as string
    const labels: string[] = pr.labels.map((label: any) => label.name)

    if (/@wip ready for review/i.test(body)) {
      return {
        wip: false,
        override: true,
      }
    }

    const { configs, custom } = await Config.get(octokit)

    let commitSubjects: string[] | null = null

    for (let i = 0; i < configs.length; i += 1) {
      const matchText = getMatcher(configs[i].terms, configs[i].locations)
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
          custom,
          ...match,
        }
      }
    }

    return {
      wip: false,
      configs,
      custom,
    }
  }

  export async function isChanged(octokit: Octokit, newStatus: Status) {
    const {
      data: { check_runs: checkRuns },
    } = await octokit.checks.listForRef({
      ...context.repo,
      ref: context.payload.pull_request!.head.sha,
      check_name: 'WIP',
    })

    if (checkRuns.length === 0) {
      return true
    }

    const [{ conclusion, output }] = checkRuns
    const isWip = conclusion !== 'success'
    const hasOverride = output && /override/.test(output.title)

    return isWip !== newStatus.wip || hasOverride !== newStatus.override
  }

  // eslint-disable-next-line no-inner-declarations
  function getOutput(newStatus: Status) {
    const output: { title?: string; summary?: string; text?: string } = {}

    if (newStatus.wip) {
      let match = (emojiToName as any)[newStatus.match!]
      if (match === undefined) {
        match = `"${newStatus.match}"` // Text match
      } else {
        match = `a ${match} emoji` // Emoji match
      }

      const map = {
        title: 'title',
        label: 'label',
        commit: 'commit subject',
      }
      const loc = map[newStatus.location!]
      const location = loc.charAt(0).toUpperCase() + loc.slice(1)

      output.title = `${location} contains ${match}`

      const pr = context.payload.pull_request!

      output.summary =
        `The ${loc} "${newStatus.text}" contains "${newStatus.match}".` +
        '\n' +
        '\n' +
        `You can override the status by adding "@wip ready for review" to the end of the [pull request description](${pr.html_url}#discussion_bucket).`

      output.text = `The default configuration is applied:

\`\`\`yaml
terms:
- wip
- work in progress
- 🚧
locations: title
\`\`\`

Read more about [WIP configuration](https://github.com/wip/app#configuration)`
    } else {
      output.title = 'Ready for review'
    }

    if (newStatus.override) {
      output.title += ' (override)'
      output.summary =
        'The status has been set to success by adding `@wip ready for review` to the pull request comment. ' +
        'You can reset the status by removing it.'
    } else if (newStatus.custom) {
      output.text = `The following configuration was applied:

<table>
  <thead>
    <th>
      terms
    </th>
    <th>
      locations
    </th>
  </thead>
  ${newStatus
    .configs!.map(
      (config) =>
        `<tr><td>${config.terms.join(', ')}</td><td>${config.locations.join(
          ', ',
        )}</td></tr>`,
    )
    .join('\n')}
</table>`
    }

    return output
  }

  export async function set(octokit: Octokit, newStatus: Status) {
    const options: {
      status?: string
      started_at?: string // eslint-disable-line
      completed_at?: string // eslint-disable-line
      conclusion?: string
    } = {}

    if (newStatus.wip) {
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
      output: getOutput(newStatus),
      name: Config.name,
      head_sha: context.payload.pull_request!.head.sha,
      head_branch: '', // workaround for https://github.com/octokit/rest.js/issues/874
      // workaround random "Bad Credentials" errors
      // https://github.community/t5/GitHub-API-Development-and/Random-401-errors-after-using-freshly-generated-installation/m-p/22905/highlight/true#M1596
      request: {
        retries: 3,
        retryAfter: 3,
      },
    })
  }
}
