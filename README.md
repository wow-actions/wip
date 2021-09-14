# WIP Action

> A Github Action to mark a pull request status with pending state if it finds specified terms in the pull request title or label.

By default, this action is setting a pull request commits state to pending if it finds one of the following terms in the pull request title or label. All terms are case insensitive.

- wip
- rfc
- work in progress
- work-in-progress
- do not merge
- do-not-merge
- 🚧

![screenshot](https://github.com/bubkoo/wip-action/blob/master/screenshot.jpg?raw=true)

## Usage

Create a `.github/workflows/wip.yml` file in the repository you want to install this action:

```yml
name: WIP

on:
  pull_request:
    types:
      - opened
      - edited
      - labeled
      - unlabeled
      - synchronize

jobs:
  WIP:
    runs-on: ubuntu-latest
    steps:
      - uses: bubkoo/check-wip@v1
        with:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

          # Set action to failed when wip.
          setFailed: false

          # Match with PR labels. Comma separated and case insensitive labels.
          labels: 'do-not-merge', 'work in progress', 'wip', 'rfc', '🚧'

          # Match with PR title. Comma separated and case insensitive keywords.
          keywords: 'do-not-merge', 'work in progress', 'wip', 'rfc', '🚧'

          # A string label to differentiate this status from the status of
          # other systems. This field is case-insensitive.
          # @see: https://docs.github.com/en/rest/reference/repos#create-a-commit-status
          context: WIP

          # The target URL to associate with this status. This URL will be
          # linked from the GitHub UI to allow users to easily see the source
          # of the status. For example, if your continuous integration system
          # is posting build status, you would want to provide the deep link
          # for the build output for this specific SHA: http://ci.example.com/user/repo/build/sha
          # @see: https://docs.github.com/en/rest/reference/repos#create-a-commit-status
          target_url: ''

          # A short description of the status.
          # @see: https://docs.github.com/en/rest/reference/repos#create-a-commit-status
          wip_description: 'work in progress'
          ready_description: 'ready for review'
```

The shortest configuration with default inputs looks like this:

```yml
name: WIP
on:
  pull_request:
    types:
      - opened
      - edited
      - labeled
      - unlabeled
      - synchronize

jobs:
  WIP:
    runs-on: ubuntu-latest
    steps:
      - uses: bubkoo/check-wip@v1
        with:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## License

The scripts and documentation in this project are released under the [MIT License](LICENSE)
