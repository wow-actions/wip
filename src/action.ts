import * as core from '@actions/core'
import * as github from '@actions/github'
import { Status } from './status'
import { Util } from './util'

export namespace Action {
  export async function run() {
    try {
      const { context } = github
      const { action, pull_request: payload } = context.payload

      const actions = [
        'opened',
        'edited',
        'labeled',
        'unlabeled',
        'synchronize',
      ]

      if (payload && action && actions.includes(action)) {
        const octokit = Util.getOctokit()
        const newStatus = await Status.get(octokit)
        const hasChange = await Status.isChanged(octokit, newStatus)
        if (hasChange) {
          await Status.set(octokit, newStatus)
        }

        // const title = ((payload.title as string) || '').toLowerCase()
        // const labels = payload.labels
        //   ? payload.labels.map((x: any) => x.name)
        //   : []
        // const blockingLabels = Util.getBlockingLabels()
        // const blockingKeywords = Util.getBlockingKeywords()

        // core.info(`labels:${blockingLabels.join(',')}`)
        // core.info(`keywords:${blockingKeywords.join(',')}`)

        // const effected: {
        //   labels: string[]
        //   keywords: string[]
        // } = {
        //   labels: [],
        //   keywords: [],
        // }

        // blockingLabels.forEach((bl) => {
        //   if (labels.includes(bl)) {
        //     effected.labels.push(bl)
        //   }
        // })

        // blockingKeywords.forEach((bk) => {
        //   if (title.includes(bk)) {
        //     effected.keywords.push(bk)
        //   }
        // })

        // const summarys: string[] = []
        // if (effected.labels.length) {
        //   summarys.push(`Blocking labels: ${effected.labels.join(', ')}`)
        // }

        // if (effected.keywords.length) {
        //   summarys.push(
        //     `Blocking keywords in title: ${effected.keywords.join(', ')}`,
        //   )
        // }

        // const isWip = summarys.length > 0
        // const desc = isWip
        //   ? Util.getWIPDescription()
        //   : Util.getReadyDescription()
        // await octokit.repos.createCommitStatus({
        //   ...context.repo,
        //   sha: payload.head.sha,
        //   state: isWip ? 'pending' : 'success',
        //   context: Util.getContect(),
        //   target_url: Util.getTargetUrl(),
        //   description: desc,
        // })

        // if (isWip) {
        //   core.info(`${desc}\n${summarys.join('\n')}`)
        // }
      }
    } catch (e) {
      core.error(e)
      core.setFailed(e.message)
    }
  }
}
