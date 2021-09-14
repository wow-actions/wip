import yaml from 'js-yaml'
import * as core from '@actions/core'

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

  export async function get() {
    const content = core.getInput('config')
    if (content) {
      const config = yaml.load(content) as Config | Config[]
      if (config) {
        if (typeof config !== 'object') {
          core.setFailed(
            'Can not parse the configurations. Please check the "config" input in your workflow file',
          )
        }

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
