import { getOctokit } from '@actions/github'

export type Octokit = ReturnType<typeof getOctokit>

export type Location = 'title' | 'label' | 'commit'

export interface Section {
  terms: string[]
  locations: Location[]
}

export interface State {
  checkRunId?: number
  externalId?: string
  wip: boolean
  configs?: Section[]
  manual?: boolean
  override?: boolean
  location?: Location
  text?: string
  match?: string
}
