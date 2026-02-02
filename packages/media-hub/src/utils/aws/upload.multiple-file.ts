import type { UploadedFile } from '../../types'
import { uploadSingleFileToS3 } from './upload-single-file'

export const uploadMultipleFileToS3 = async (
  files: Express.Multer.File[],
  folder: string
): Promise<UploadedFile[]> => {
  return Promise.all(files.map((file) => uploadSingleFileToS3(file, folder)))
}
