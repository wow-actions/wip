import { Config } from './config'

export namespace Matcher {
  const matchTerms = (terms: string[], text: string) => {
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

  export const generate =
    (locations: Config.Location[], terms: string[]) =>
    (location: Config.Location, targets?: string[] | string | null) => {
      if (!locations.includes(location) || targets == null) {
        return null
      }

      const texts = Array.isArray(targets) ? targets : [targets]
      for (let i = 0, j = texts.length; i < j; i += 1) {
        const text = texts[i]
        const match = matchTerms(terms, text)
        if (match) {
          return { location, text, match }
        }
      }

      return null
    }
}
