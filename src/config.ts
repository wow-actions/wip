import { getInput } from '@actions/core'
import yaml from 'js-yaml'
import { Octokit } from './types'
import { Util } from './util'

export namespace Config {
  export type Location = 'title' | 'label' | 'commit'

  export interface Item {
    terms: string[]
    locations: Location[]
  }

  export const defaultConfig: Item = {
    locations: ['title', 'label'],
    terms: ['wip', 'work in progress', '🚧'],
  }

  export const name = 'wip'

  export async function get(octokit: Octokit) {
    try {
      const path = getInput('CONFIG_FILE')
      if (path) {
        const content = await Util.getFileContent(octokit, path)
        if (content) {
          const config = yaml.load(content) as Item | Item[]
          if (config) {
            const configs = Array.isArray(config) ? config : [config]
            const keys: (keyof Item)[] = ['terms', 'locations']
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

            return {
              configs,
              custom: true,
            }
          }
        }
      }
    } catch (error) {
      if (error.status !== 404) {
        throw error
      }
    }

    return {
      configs: [defaultConfig],
    }
  }
}
