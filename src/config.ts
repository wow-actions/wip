import yaml from 'js-yaml'
import * as core from '@actions/core'
import * as github from '@actions/github'
import { Octokit } from './octokit'

export interface Config {
  locations: Config.Location[]
  terms: string[]
}

export namespace Config {
  export type Location = 'title' | 'label' | 'commit'

  export const defaults: Config = {
    locations: ['title', 'label'],
    terms: [
      'wip',
      'work in progress',
      'work-in-progress',
      'do not merge',
      'do-not-merge',
      'rfc',
      '🚧',
    ],
  }

  const configPath = './.github/workflows/config/wip.yml'

  const readfile = async (octokit: Octokit, path: string) => {
    try {
      const response = await octokit.rest.repos.getContent({
        ...github.context.repo,
        path,
      })

      const { content } = response.data as any
      return content ? Buffer.from(content, 'base64').toString() : null
    } catch (err) {
      return null
    }
  }

  export async function get(octokit: Octokit) {
    const raw = core.getInput('config')
    core.debug(`raw: ${raw}`)
    core.debug(`${yaml.load(raw)}`)
    const content = await readfile(octokit, configPath)
    if (content) {
      const config = yaml.load(content) as Config | Config[]
      if (config) {
        const configs = Array.isArray(config) ? config : [config]
        const keys: (keyof Config)[] = ['terms', 'locations']
        configs.forEach((entry) => {
          keys.forEach((key) => {
            if (!entry[key]) {
              entry[key] = defaults[key] as any
            } else {
              if (!Array.isArray(entry[key])) {
                entry[key] = [entry[key] as any]
              }

              entry[key] = (entry[key] as any).map((item: any) => `${item}`)
            }
          })
        })

        core.debug(`[wip] Use manual configuration: ${JSON.stringify(configs)}`)

        return {
          configs,
          manual: true,
        }
      }
    }

    core.debug(`[wip] Use default configuration: ${JSON.stringify([defaults])}`)

    return {
      configs: [defaults],
      manual: false,
    }
  }
}
