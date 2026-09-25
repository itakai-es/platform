/**
 * Composable to get the full URL for images referenced from API payloads.
 *
 * URLs starting with `/uploads/` point to backend-served user content
 * (teacher badges, class covers, help imagery, etc.) backed by the
 * `api_uploads_prod` Docker volume. Those need `${apiBase}` prepended.
 *
 * Las entregas y los documentos de misión no se piden por su URL: van por
 * `useProtectedFiles`, que pasa por la API y comprueba el acceso.
 *
 * Every other relative path resolves against the frontend's own origin:
 *   - `/badges/` → versioned system badge SVGs in `app/public/badges/`
 *   - `/avatars/`, `/logo/`, etc. → other frontend static assets
 * These are left as-is so the browser resolves them against the current
 * origin automatically.
 */
export function useImageUrl() {
  const config = useRuntimeConfig()

  const getImageUrl = (url: string | undefined | null): string | undefined => {
    if (!url) return undefined

    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url
    }

    if (url.startsWith('/uploads')) {
      return `${config.public.apiBase}${url}`
    }

    return url
  }

  return {
    getImageUrl,
  }
}
