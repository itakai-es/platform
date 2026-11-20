import { createHmac } from 'node:crypto'
import { prisma } from '../../config/database.js'
import { env } from '../../config/env.js'
import { registerJob } from '../../utils/scheduler.js'
import { rateLimitOrigin } from '../../utils/trust-proxy.js'

const VISIT_WINDOW_HOURS = 24

/**
 * La marca dura 24 horas desde la última visita contada. La clave se deriva
 * del origen de red y del artículo para evitar guardar la IP o cruzar visitas
 * entre artículos. La consulta bloquea la fila del artículo hasta escribir la
 * marca y el incremento, para devolver el total actual incluso si se repite.
 */
export async function registerView(articleId: string, ip: string) {
  const visitorKey = createHmac('sha256', env.JWT_ACCESS_SECRET)
    .update('help-article-visit\0')
    .update(articleId)
    .update('\0')
    .update(rateLimitOrigin(ip))
    .digest('hex')

  const [result] = await prisma.$queryRaw<{ views: number }[]>`
    WITH article AS (
      SELECT id, views FROM help_articles
      WHERE id = ${articleId} AND status = 'publicado'
      FOR NO KEY UPDATE
    ), counted AS (
      INSERT INTO help_article_visits (article_id, visitor_key, counted_at)
      SELECT id, ${visitorKey}, statement_timestamp() FROM article
      ON CONFLICT (article_id, visitor_key) DO UPDATE
        SET counted_at = EXCLUDED.counted_at
        WHERE help_article_visits.counted_at
          <= EXCLUDED.counted_at - ${VISIT_WINDOW_HOURS} * INTERVAL '1 hour'
      RETURNING article_id
    ), incremented AS (
      UPDATE help_articles AS a
      SET views = a.views + 1
      FROM counted
      WHERE a.id = counted.article_id
      RETURNING a.views
    )
    SELECT COALESCE(incremented.views, article.views) AS views
    FROM article LEFT JOIN incremented ON TRUE
  `

  return result ?? null
}

export function registerHelpVisitJobs() {
  registerJob({
    name: 'purge-expired-help-visits',
    everyMs: 60 * 60 * 1000,
    async run() {
      const deleted = await prisma.$executeRaw`
        DELETE FROM help_article_visits
        WHERE counted_at <= statement_timestamp() - ${VISIT_WINDOW_HOURS} * INTERVAL '1 hour'
      `
      return { deleted }
    },
  })
}
