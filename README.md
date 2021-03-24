# check-wip

> A GitHub Action sets a PR status to pending when any label or keyword in the title indicating it is WIP.

## Usage

Create a `.github/workflows/wip.yml` file in the repository you want to install this action, then add the following to it:

```yml
name: WIP
on:
  pull_request:
    types:
      - opened
      - synchronize
      - reopened
      - edited
      - labeled
      - unlabeled
jobs:
  WIP:
    runs-on: ubuntu-latest
    steps:
      - uses: bubkoo/check-wip@v1
        with:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          labels: do-not-merge, wip, rfc
          keywords: WIP, wip, RFC, rfc
```

## License

The scripts and documentation in this project are released under the [MIT License](LICENSE)
