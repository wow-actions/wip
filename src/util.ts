import * as core from '@actions/core'
import * as github from '@actions/github'
import { Octokit } from './types'

export namespace Util {
  export function getOctokit() {
    const token = core.getInput('GITHUB_TOKEN', { required: true })
    return github.getOctokit(token)
  }

  export function matchTerms(terms: string[], text: string) {
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
}
