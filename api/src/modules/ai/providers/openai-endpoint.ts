/**
 * URL de una ruta OpenAI-compatible (`chat/completions`, `images/generations`,
 * `models`) a partir de la base configurada en el panel. La base puede ser:
 *  - el host, sin versión (`http://localhost:8000`, `https://api.openai.com`)
 *    → se añade `/v1`;
 *  - una base que ya trae su versión (`https://api.openai.com/v1`,
 *    `https://host/api/v4`) → se respeta tal cual.
 */
export function openAiEndpoint(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/+$/, '')
  return /\/v\d+$/.test(base) ? `${base}/${path}` : `${base}/v1/${path}`
}
