import slugify from 'slugify'

export const getSlug = (value: string): string => {
  return slugify(value, {
    replacement: '-',
    lower: true,
    strict: false,
    trim: true,
    locale: 'en',
  })
}
