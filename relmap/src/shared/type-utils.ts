import type { Result } from './types'
import type { SetOptional, SetRequired, Simplify } from 'type-fest'

export type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T

export type RequiredExcept<T, K extends keyof T> = Required<Omit<T, K>> & Pick<T, K>

export type AsyncResult<T> = Promise<Result<T>>

export type { SetOptional, SetRequired, Simplify }
