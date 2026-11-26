import { normalizeBase } from './normalizeBase'

export const appBase = normalizeBase(import.meta.env.BASE_URL)

export const routerBasename = appBase === '/' ? '/' : appBase.slice(0, -1)
