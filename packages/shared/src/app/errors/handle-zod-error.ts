import httpStatus from 'http-status'
import { ZodError } from 'zod'
import type { IErrorSources, ISendErrorResponse } from '../types'
import { error } from 'node:console'

export const handleZodError = (err: ZodError): ISendErrorResponse => {
  const errorSources: IErrorSources[] = err.issues.map((issue) => {
    return {
      path: issue.path[issue.path.length - 1] as string,
      message: issue.message,
    }
  })

  return {
    statusCode: httpStatus.BAD_REQUEST,
    message: errorSources.length ? (errorSources[0]?.message as string) : 'Zod Validation Error',
    errorSources,
  }
}
