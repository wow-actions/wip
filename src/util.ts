import * as core from '@actions/core'
import * as github from '@actions/github'
import emojiToName from '../node_modules/gemoji/emoji-to-name.json'
import { Octokit, Location, State } from './types'

export namespace Util {
  export function getOctokit() {
    const token = core.getInput('GITHUB_TOKEN', { required: true })
    return github.getOctokit(token)
  }

  export async function getFileContent(octokit: Octokit, path: string) {
    try {
      const response = await octokit.repos.getContent({
        ...github.context.repo,
        path,
      })

      const content = (response.data as any).content || ''
      return Buffer.from(content, 'base64').toString()
    } catch (err) {
      return null
    }
  }

  export async function getCommitSubjects(octokit: Octokit) {
    const { context } = github
    const { data: commits } = await octokit.pulls.listCommits({
      ...context.repo,
      pull_number: context.payload.pull_request!.number,
    })

    return commits.map((e) => e.commit.message.split('\n')[0])
  }

  const matchTerms = (terms: string[], text: string) => {
    // JS RegExp defines explicitly defines a \w word character as: [A-Za-z0-9_]
    // Therefore, \b word boundaries only work for words that start/end with an above word character.
    // e.g.
    //   > /\b🚧\b/i.test('🚧')
    //   < false
    // but
    //   > /\bGIT🚧GIT\b/i.test('GIT🚧GIT')
    //   < true
    // and
    //   > /\bfixup!\b/i.test('fixup!')
    //   < false

    // A decision has been made to enforce word boundaries for all match terms, excluding terms which contain only non-word \W characters.
    // Therefore, we prepend and append a \W look-behind and look-ahead on all terms which DO NOT match /^\W+$/i.
    const wordBoundaryTerms = terms.map((str) => {
      return str.replace(/^(.*\w+.*)$/i, '(?<=^|\\W)$1(?=\\W|$)')
    })

    // Now concat all wordBoundaryTerms (terms with boundary checks added where appropriate) and match across entire text.
    // We only care whether a single instance is found at all, so a global search is not necessary and the first capture group is returned.
    const matches = text.match(
      new RegExp(`(${wordBoundaryTerms.join('|')})`, 'i'),
    )
    return matches ? matches[1] : null
  }

  export const getMatcher = (terms: string[], locations: Location[]) => (
    location: Location,
    text: string,
  ) => {
    if (!locations.includes(location)) {
      return null
    }

    const match = matchTerms(terms, text)
    return match ? { location, text, match } : null
  }

  export function getOutput(nextStatus: State) {
    const output: { title?: string; summary?: string; text?: string } = {}

    if (nextStatus.wip) {
      let match = (emojiToName as any)[nextStatus.match!]
      if (match === undefined) {
        match = `"${nextStatus.match}"` // Text match
      } else {
        match = `a ${match} emoji` // Emoji match
      }

      const map = {
        title: 'title',
        label: 'label',
        commit: 'commit subject',
      }

      const ucfirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
      const location = map[nextStatus.location!]

      output.title = `${ucfirst(location)} contains ${match}`

      const pr = github.context.payload.pull_request!

      output.summary =
        `The ${location} "${nextStatus.text}" contains "${nextStatus.match}".` +
        '\n' +
        '\n' +
        `You can override the status by adding "@wip ready for review" to the end of the [pull request description](${pr.html_url}#discussion_bucket).`

      output.text = `The default configuration is applied:

\`\`\`yaml
terms:
  - wip
  - work in progress
  - 🚧
locations:
  - title
  - label
\`\`\`

Read more about [WIP configuration](https://github.com/marketplace/actions/wip-action#configuration)`
    } else {
      output.title = 'Ready for review'
    }

    if (nextStatus.override) {
      output.title += ' (override)'
      output.summary =
        'The status has been set to success by adding `@wip ready for review` to the pull request comment. ' +
        'You can reset the status by removing it.'
    } else if (nextStatus.manual) {
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
  ${nextStatus
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
}
