# WIP Action

> Sets a pull request status to pending. Inspirated by [WIP](https://github.com/wip/app) App.

By default, WIP is setting a pull request status to pending if it finds one of the following terms in the pull request title or label.

- wip
- work in progress
- 🚧

## Usage

Create a `.github/workflows/wip.yml` file in the repository you want to install this action, then add the following to it:

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
          # GitHub token for authentication.
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          # Path to configuration file relative the root of your repo.
          # e.g.: .github/workflows/config/wip.yml
          CONFIG_FILE: config-file-path
```

## Configuration

Two options can be configured in the configuration file.

- **locations**: any of `title` (pull request title), `label`(lable name) and `commit` (commit subject: 1st line of the pull request’s commit messages). Default: `title` and `label`
- **terms**: list of strings to look for in the defined locations. All terms are case-insensitive. Default: "wip", "work in progress" and "🚧"

Example:

```yml
locations:
  - title
  - label
  - commit
terms:
  - do not merge
  - ⛔
```

The above configuration makes WIP look for `do not merge` and `⛔` in the pull request title, all assigned label names and all commit subjects.

You can also configure different terms for different locations:

```yaml
- terms: ⛔
  locations:
    - title
    - label
- terms:
    - fixup!
    - squash!
  locations: commit
```

The above configuration looks first for `⛔` in the pull request title and assigned label names. After that it looks for `fixup!` and `squash!` in the commit subjects.

**A Note About Term Matching:** Terms which contain only non-word characters as defined by JS RegExp `[^a-za-z0-9_]` are matched regardless of word boundaries. Any other terms (which may contain a mix of word and non-word characters will only match when surrounded by start/end OR non-word characters.

## License

The scripts and documentation in this project are released under the [MIT License](LICENSE)
