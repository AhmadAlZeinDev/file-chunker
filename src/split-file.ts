import { Logger, logMessage } from "./common";

export interface SplitFileOptions extends Logger {
  file: File;
  chunkSize?: number;
}

export interface SplitFileResult {
  chunk: File;
  chunkNumber: number;
  totalChunks: number;
  fileName: string;
  progress: number;
}

function generateUUID(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

function validateParams({ file, chunkSize }: SplitFileOptions) {
  if (!(file instanceof File)) {
    throw new Error("Invalid file: Expected a valid File object.");
  }

  if (!chunkSize || chunkSize <= 0) {
    throw new Error("Invalid chunk size: Must be a positive number.");
  }
}

async function* splitFile({
  file,
  chunkSize = 5 * 1024 * 1024,
  options,
}: SplitFileOptions): AsyncGenerator<SplitFileResult> {
  try {
    validateParams({ file, chunkSize });

    const totalChunks = Math.ceil(file.size / chunkSize);
    if (totalChunks === 0) {
      throw new Error("File size is too small to be split.");
    }

    const fileExtension = file?.name?.split(".")?.pop() || "bin";
    const fileName = `${generateUUID()}.${fileExtension}`;
    let chunkNumber = 0;
    let start = 0;
    let end = chunkSize;

    while (start < file.size) {
      const chunk = file.slice(start, end);

      yield {
        chunk: new File([chunk], fileName),
        chunkNumber,
        totalChunks,
        fileName,
        progress: Math.ceil(((chunkNumber + 1) / totalChunks) * 100),
      };

      chunkNumber++;
      start = end;
      end = start + chunkSize;
    }
  } catch (err) {
    logMessage(
      `Error during file splitting: ${(err as Error).message}`,
      true,
      options
    );
    throw err;
  }
}

export { splitFile };
