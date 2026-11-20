export const HELP_COMMAND_PLATFORMS = [
  { value: 'linux', label: 'Linux' },
  { value: 'windows', label: 'Windows' },
  { value: 'macos', label: 'macOS' },
] as const

export type HelpCommandPlatform = (typeof HELP_COMMAND_PLATFORMS)[number]['value']

/** Los comentarios delimitan un único bloque con las tres variantes de una lección. */
export function splitHelpCommandPlatforms(body: string) {
  const variants =
    /^<!-- commands:windows -->\r?\n([\s\S]*?)^<!-- commands:linux -->\r?\n([\s\S]*?)^<!-- commands:macos -->\r?\n([\s\S]*?)^<!-- commands:end -->[ \t]*(?:\r?\n|$)/m.exec(
      body
    )
  if (!variants) return null

  const [block, windows = '', linux = '', macos = ''] = variants
  return {
    before: body.slice(0, variants.index),
    commands: { windows, linux, macos },
    after: body.slice(variants.index + block.length),
  }
}
