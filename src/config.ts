import yaml from 'js-yaml'
import * as core from '@actions/core'
import { Octokit, Section } from './types'
import { Util } from './util'

export namespace Config {
  export const defaultConfig: Section = {
    locations: ['title', 'label'],
    terms: ['wip', 'work in progress', '🚧'],
  }

  export async function get(octokit: Octokit) {
    try {
      const path = core.getInput('CONFIG_FILE')
      if (path) {
        const content = await Util.getFileContent(octokit, path)
        if (content) {
          const config = yaml.load(content) as Section | Section[]
          if (config) {
            const configs = Array.isArray(config) ? config : [config]
            const keys: (keyof Section)[] = ['terms', 'locations']
            configs.forEach((entry) => {
              keys.forEach((key) => {
                if (!entry[key]) {
                  entry[key] = defaultConfig[key] as any
                }

                if (!Array.isArray(entry[key])) {
                  entry[key] = [entry[key] as any]
                }

                entry[key] = entry[key].map((item: any) => `${item}`) as any
              })
            })

            core.debug(
              `Use manual configuration: ${JSON.stringify([defaultConfig])}`,
            )

            return {
              configs,
              manual: true,
            }
          }
        }
      }
    } catch (error) {
      if (error.status !== 404) {
        throw error
      }
    }

    core.debug(`Use default configuration: ${JSON.stringify([defaultConfig])}`)

    return {
      configs: [defaultConfig],
    }
  }
}
