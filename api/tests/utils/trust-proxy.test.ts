import { describe, it, expect, afterAll } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import {
  isPrivateAddress,
  rateLimitOrigin,
  resolveTrustProxy,
} from '../../src/utils/trust-proxy.js'

/**
 * La dirección del cliente sale del proxy de delante y no de lo que el cliente
 * escriba en `X-Forwarded-For`.
 */

const apps: FastifyInstance[] = []

/** Una aplicación que responde con `request.ip`, configurada como la de verdad. */
async function appWith(value: string | undefined) {
  const app = Fastify({ trustProxy: resolveTrustProxy(value) })
  app.get('/ip', async request => ({ ip: request.ip }))
  await app.ready()
  apps.push(app)
  return app
}

/** `request.ip` de una petición que llega desde `peer` con esa cabecera (o sin ella). */
async function ipSeen(app: FastifyInstance, peer: string, forwardedFor?: string) {
  const response = await app.inject({
    method: 'GET',
    url: '/ip',
    remoteAddress: peer,
    headers: forwardedFor ? { 'x-forwarded-for': forwardedFor } : {},
  })
  return response.json().ip as string
}

const PROXY = '172.18.0.5'
const CLIENT = '203.0.113.7'
const FORGED = '198.51.100.99'

afterAll(async () => {
  await Promise.all(apps.map(app => app.close()))
})

describe('por defecto: el salto inmediato, si viene de una red privada', () => {
  it('detrás del proxy, la dirección es la que añade él', async () => {
    const app = await appWith(undefined)
    expect(await ipSeen(app, PROXY, CLIENT)).toBe(CLIENT)
  })

  it('detrás del proxy y sin cabecera, es la del proxy', async () => {
    const app = await appWith(undefined)
    expect(await ipSeen(app, PROXY)).toBe(PROXY)
  })

  it('lo que el cliente escribe en la cabecera antes de pasar por el proxy no cuenta', async () => {
    // El proxy añade la dirección real al final de lo que mandó el cliente.
    const app = await appWith(undefined)
    expect(await ipSeen(app, PROXY, `${FORGED}, ${CLIENT}`)).toBe(CLIENT)
    expect(await ipSeen(app, PROXY, `10.0.0.1, ${CLIENT}`)).toBe(CLIENT)
  })

  it('un cliente que llega directamente no puede presentarse con otra dirección', async () => {
    const app = await appWith(undefined)
    expect(await ipSeen(app, CLIENT, FORGED)).toBe(CLIENT)
    expect(await ipSeen(app, CLIENT, '127.0.0.1')).toBe(CLIENT)
    expect(await ipSeen(app, CLIENT)).toBe(CLIENT)
  })

  it('«private» es lo mismo que no decir nada', async () => {
    const app = await appWith('private')
    expect(await ipSeen(app, PROXY, CLIENT)).toBe(CLIENT)
    expect(await ipSeen(app, CLIENT, FORGED)).toBe(CLIENT)
  })

  it('reconoce loopback y redes privadas, también escritas como IPv6', () => {
    for (const address of [
      '127.0.0.1',
      '10.1.2.3',
      '172.16.0.1',
      '172.31.255.254',
      '192.168.1.10',
      '169.254.1.1',
      '::1',
      'fd12:3456::1',
      'fe80::1',
      '::ffff:172.18.0.5',
    ]) {
      expect(isPrivateAddress(address), address).toBe(true)
    }
    for (const address of ['203.0.113.7', '172.32.0.1', '8.8.8.8', '2001:db8::1', '', undefined]) {
      expect(isPrivateAddress(address), String(address)).toBe(false)
    }
  })
})

describe('otras configuraciones', () => {
  it('«false» no se fía de nadie', async () => {
    for (const value of ['false', '0']) {
      const app = await appWith(value)
      expect(await ipSeen(app, PROXY, CLIENT)).toBe(PROXY)
    }
  })

  it('un número se fía de ese número de saltos', async () => {
    const app = await appWith('2')
    // Cliente → proxy externo → proxy de docker → API.
    expect(await ipSeen(app, PROXY, `${FORGED}, ${CLIENT}, 192.0.2.10`)).toBe(CLIENT)
  })

  it('una lista se fía solo de esas direcciones', async () => {
    const app = await appWith('172.18.0.0/16, ::1')
    expect(await ipSeen(app, PROXY, CLIENT)).toBe(CLIENT)
    expect(await ipSeen(app, '10.0.0.5', CLIENT)).toBe('10.0.0.5')
  })

  it('«true» y lo que no se entiende detienen el arranque', () => {
    expect(() => resolveTrustProxy('true')).toThrow(/TRUST_PROXY/)
    expect(() => resolveTrustProxy('quizá')).toThrow(/TRUST_PROXY/)
    expect(() => resolveTrustProxy('10.0.0.0/8, nginx')).toThrow(/TRUST_PROXY/)
    expect(() => resolveTrustProxy(',')).toThrow(/TRUST_PROXY/)
  })
})

describe('con qué se cuenta un límite por origen', () => {
  it('una IPv4 es ella misma, también escrita como IPv6', () => {
    expect(rateLimitOrigin('203.0.113.7')).toBe('203.0.113.7')
    expect(rateLimitOrigin('::ffff:203.0.113.7')).toBe('203.0.113.7')
  })

  it('una IPv6 cuenta por su prefijo /64, se escriba como se escriba', () => {
    const network = '2001:db8:1:2::/64'
    for (const address of [
      '2001:db8:1:2::1',
      '2001:db8:1:2:abcd:ef01:2345:6789',
      '2001:0db8:0001:0002::ffff',
      '2001:DB8:1:2::1',
      '2001:db8:1:2::9%eth0',
    ]) {
      expect(rateLimitOrigin(address), address).toBe(network)
    }
    expect(rateLimitOrigin('2001:db8:1:3::1')).toBe('2001:db8:1:3::/64')
    expect(rateLimitOrigin('::1')).toBe('0:0:0:0::/64')
    expect(rateLimitOrigin('2001:db8::')).toBe('2001:db8:0:0::/64')
    expect(rateLimitOrigin('64:ff9b::203.0.113.7')).toBe('64:ff9b:0:0::/64')
  })
})
