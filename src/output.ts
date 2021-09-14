import * as github from '@actions/github'
import { emojiToName } from 'gemoji'
import { Status } from './status'
import { Octokit } from './Octokit'
import { Config } from './config'

export namespace Output {
  const ucfirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

  const getDefaultConfiguration = () => `

\`\`\`yml
terms:
  - wip
  - work in progress
  - 🚧
locations:
  - title
  - label
\`\`\`

`

  const getREADME = () => `

By default, WIP is setting a pull request status to pending if it finds one of the following terms in the pull request title or label.

- wip
- work in progress
- work-in-progress
- do not merge
- do-not-merge
- 🚧

We can custom the configurations by creating a \`.github/apps/wip.yml\` file in your repository. Two options can be configured in the configuration file.

- **locations**: any of \`title\` (pull request title), \`label\`(lable name) and \`commit\` (commit subject: 1st line of the pull request’s commit messages). Default: \`title\` and \`label\`
- **terms**: list of strings to look for in the defined locations. All terms are case-insensitive. Default: "wip", "work in progress" and "🚧"


Example:

\`\`\`yml
locations:
  - title
  - label
  - commit
terms:
  - do not merge
  - ⛔
\`\`\`

The above configuration makes WIP look for \`do not merge\` and \`⛔\` in the pull request title, all assigned label names and all commit subjects.

You can also configure different terms for different locations:

\`\`\`yaml
- terms: ⛔
  locations:
    - title
    - label
- terms:
    - fixup!
    - squash!
  locations: commit
\`\`\`

The above configuration looks first for \`⛔\` in the pull request title and assigned label names. After that it looks for \`fixup!\` and \`squash!\` in the commit subjects.

**A Note About Term Matching:** Terms which contain only non-word characters as defined by JS RegExp \`[^a-za-z0-9_]\` are matched regardless of word boundaries. Any other terms (which may contain a mix of word and non-word characters will only match when surrounded by start/end OR non-word characters.

`

  const getManualConfiguration = (configs: Config[]) => {
    const line = (c: Config) =>
      `| ${c.terms.join(', ')} | ${c.locations.join(', ')} |`

    return `
| terms  | locations |
|--------|-----------|
${configs.map((config) => line(config)).join('\n')}
`
  }

  export function get(octokit: Octokit, state: Status.State) {
    const output: { title: string; summary: string; text?: string } = {
      title: '',
      summary: '',
    }

    if (state.wip) {
      let emoji = (emojiToName as any)[state.match!]
      if (emoji === undefined) {
        emoji = `"${state.match}"` // Text match
      } else {
        emoji = `a ${emoji} emoji` // Emoji match
      }

      const map = {
        title: 'title',
        label: 'label',
        commit: 'commit subject',
      }

      const location = map[state.location!]

      output.title = `${ucfirst(location)} contains ${emoji}`

      const pr = github.context.payload.pull_request!

      output.summary =
        // tslint:disable-next-line
        `The ${location} "${state.text}" contains "${state.match}".` +
        '\n' +
        '\n' +
        `You can override the status by adding "@wip ready for review" to the end of the [pull request description](${pr.html_url}#discussion_bucket).`

      output.text =
        // tslint:disable-next-line
        `The default configuration is applied:${getDefaultConfiguration()}${getREADME()}`
    } else {
      output.title = 'Ready for review'
    }

    if (state.override) {
      output.title += ' (override)'
      output.summary =
        'The status has been set to success by adding `@wip ready for review` to the pull request comment. ' +
        'You can reset the status by removing it.'
    } else if (state.manual) {
      output.text =
        // tslint:disable-next-line
        `The following configuration was applied:${getManualConfiguration(
          state.configs!,
        )}${getREADME()}`
    }

    return output
  }
}
