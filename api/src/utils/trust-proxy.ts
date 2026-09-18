import { BlockList, isIP } from 'node:net'

/**
 * De quién se fía la API para saber la dirección real de quien pide.
 *
 * La API va detrás de un proxy inverso (el nginx del despliegue con docker
 * compose) que le pasa la dirección del cliente en `X-Forwarded-For`. Si se
 * hiciera caso a esa cabecera venga de donde venga, cualquiera podría escribirla
 * a mano y presentarse con la dirección que quisiera; si no se le hace ningún
 * caso, todas las peticiones parecen venir del proxy. De `request.ip` dependen
 * los límites de intentos por origen y la dirección que se guarda con cada
 * sesión, así que las dos cosas importan.
 *
 * Se configura con `TRUST_PROXY`:
 *
 * - sin definir (o `private`): se confía solo en el salto inmediato, y solo si
 *   llega desde una red local o privada (loopback, enlace local, 10/8,
 *   172.16/12, 192.168/16 y sus equivalentes en IPv6). Es el caso del proxy del
 *   propio despliegue: la dirección buena es la última que añade él a la
 *   cabecera. Quien llegue directamente desde fuera no pasa por ahí y su
 *   cabecera se ignora. Supone que el puerto de la API no se publica: si se
 *   publica (`ports:` en docker compose), las conexiones que entran por él
 *   llegan desde la pasarela de la red de docker, que es privada, y su cabecera
 *   sí se creería. En ese caso, las direcciones exactas del proxy o `false`.
 * - `false` (o `0`): no se confía en nadie; para servir la API sin proxy delante.
 * - un número N: se confía en los N saltos más cercanos, vengan de donde vengan;
 *   para una cadena de proxies conocida (otro proxy delante del de docker).
 * - una lista de direcciones o redes separadas por comas (`10.0.0.0/8,::1`): se
 *   confía solo en esas.
 *
 * `true` (fiarse de todo) no se acepta: con él la dirección la elige el cliente.
 */

export type TrustProxyFunction = (address: string | undefined, hop: number) => boolean
export type TrustProxySetting = false | number | string | TrustProxyFunction

const privateNetworks = new BlockList()
// Loopback, enlace local y redes privadas, en IPv4 y en IPv6.
privateNetworks.addSubnet('127.0.0.0', 8, 'ipv4')
privateNetworks.addSubnet('169.254.0.0', 16, 'ipv4')
privateNetworks.addSubnet('10.0.0.0', 8, 'ipv4')
privateNetworks.addSubnet('172.16.0.0', 12, 'ipv4')
privateNetworks.addSubnet('192.168.0.0', 16, 'ipv4')
privateNetworks.addAddress('::1', 'ipv6')
privateNetworks.addSubnet('fe80::', 10, 'ipv6')
privateNetworks.addSubnet('fc00::', 7, 'ipv6')

/** Una IPv4 que llega escrita como IPv6 (`::ffff:10.0.0.2`) se trata como IPv4. */
function unmapIPv4(address: string): string {
  const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)
  return mapped ? mapped[1] : address
}

/** ¿Es una dirección de loopback o de una red local o privada? */
export function isPrivateAddress(address: string | undefined): boolean {
  if (!address) return false
  const plain = unmapIPv4(address)
  const family = isIP(plain)
  if (family === 4) return privateNetworks.check(plain, 'ipv4')
  if (family === 6) return privateNetworks.check(plain, 'ipv6')
  return false
}

/** Por defecto: solo el salto inmediato, y solo si viene de una red privada. */
export const trustPrivateNextHop: TrustProxyFunction = (address, hop) =>
  hop === 0 && isPrivateAddress(address)

/** Nombres de rangos que entiende Fastify en una lista de direcciones. */
const RANGE_NAMES = new Set(['loopback', 'linklocal', 'uniquelocal'])

function isAddressOrNetwork(entry: string): boolean {
  if (RANGE_NAMES.has(entry)) return true
  const [address, prefix, ...rest] = entry.split('/')
  if (rest.length > 0 || isIP(address) === 0) return false
  return prefix === undefined || /^\d{1,3}$/.test(prefix)
}

/**
 * Convierte el valor de `TRUST_PROXY` en la opción `trustProxy` de Fastify.
 * Un valor que no se entiende detiene el arranque: mejor eso que adivinar.
 */
export function resolveTrustProxy(value: string | undefined): TrustProxySetting {
  const setting = value?.trim().toLowerCase() ?? ''

  if (setting === '' || setting === 'private') return trustPrivateNextHop
  if (setting === 'false' || setting === '0') return false
  if (setting === 'true') {
    throw new Error(
      'TRUST_PROXY=true haría caso a la dirección que diga cualquier cliente. ' +
        'Indica cuántos proxies hay delante (TRUST_PROXY=1) o sus direcciones.'
    )
  }
  if (/^\d+$/.test(setting)) return Number(setting)

  const entries = setting
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean)
  const invalid = entries.filter(entry => !isAddressOrNetwork(entry))
  if (entries.length === 0 || invalid.length > 0) {
    throw new Error(`TRUST_PROXY no es válido: «${value}»`)
  }
  return entries.join(',')
}

/**
 * Con qué se cuenta un límite por origen. Una IPv4 escrita como IPv6 cuenta como
 * la IPv4, y una IPv6 por su prefijo /64: cada conexión suele tener uno entero y
 * dentro de él puede estrenar dirección en cada intento.
 */
export function rateLimitOrigin(address: string): string {
  const plain = unmapIPv4(address.split('%')[0])
  if (isIP(plain) !== 6) return plain

  // Se despliega el `::` para quedarse con los cuatro primeros grupos. Una IPv4
  // incrustada al final ocupa dos grupos, pero nunca de los cuatro primeros.
  const groupsIn = (part: string) =>
    part ? part.split(':').reduce((n, group) => n + (group.includes('.') ? 2 : 1), 0) : 0
  const [head, tail] = plain.split('::')
  const headGroups = head ? head.split(':') : []
  const missing = tail === undefined ? 0 : 8 - groupsIn(head) - groupsIn(tail)
  const groups = [...headGroups, ...Array(missing).fill('0'), ...(tail ? tail.split(':') : [])]
  const prefix = groups.slice(0, 4).map(group => parseInt(group, 16).toString(16))
  return `${prefix.join(':')}::/64`
}
