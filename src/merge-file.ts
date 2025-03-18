import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "fs";
import path from "path";
import { Logger, logMessage } from "./common";

interface File {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: any;
  size: number;
}

export interface SaveChunkOptions extends Logger {
  file: File;
  chunkNumber: number;
  totalChunks: number;
  outputDir?: string;
  chunkDir?: string;
}

export interface SaveChunkResult {
  success: boolean;
  message: string;
  mergedFilePath?: string;
}

function validateParams({
  file,
  chunkNumber,
  totalChunks,
  outputDir,
  chunkDir,
}: SaveChunkOptions) {
  chunkNumber = Number(chunkNumber);
  totalChunks = Number(totalChunks);
  
  if (!file || !file.originalname || !file.buffer) {
    throw new Error(
      "Invalid file: Expected a valid file object with originalname and buffer."
    );
  }

  if (isNaN(chunkNumber) || chunkNumber < 0) {
    throw new Error(
      `Invalid chunk number: Received ${chunkNumber}, expected a non-negative number.`
    );
  }

  if (isNaN(totalChunks) || totalChunks <= 0 || chunkNumber >= totalChunks) {
    throw new Error(
      `Invalid totalChunks: Received ${totalChunks}, expected a positive number greater than chunkNumber.`
    );
  }

  if (typeof outputDir !== "string" || typeof chunkDir !== "string") {
    throw new Error(
      "Invalid directory paths: outputDir and chunkDir must be valid strings."
    );
  }
}

async function saveChunk({
  file,
  chunkNumber,
  totalChunks,
  outputDir = "./uploads",
  chunkDir = "./uploads/chunks",
  options,
}: SaveChunkOptions): Promise<SaveChunkResult> {
  try {
    validateParams({ file, chunkNumber, totalChunks, outputDir, chunkDir });

    const extension = path.extname(file.originalname) || ".bin";
    const fileName = path.basename(file.originalname, extension);
    chunkNumber = Number(chunkNumber);
    totalChunks = Number(totalChunks);

    chunkDir = path.resolve(chunkDir);
    outputDir = path.resolve(outputDir);

    if (!existsSync(chunkDir)) mkdirSync(chunkDir, { recursive: true });

    const chunkFilePath = path.join(
      chunkDir,
      `${fileName}.part_${chunkNumber}`
    );
    try {
      writeFileSync(chunkFilePath, file.buffer as Buffer);
      logMessage(
        `Chunk ${chunkNumber + 1}/${totalChunks} saved: ${chunkFilePath}`,
        false,
        options
      );
    } catch (err) {
      logMessage(`Error saving chunk ${chunkNumber}: ${err}`, true, options);
      throw new Error("Failed to save chunk");
    }

    if (chunkNumber === totalChunks - 1) {
      const mergedFilePath = await mergeChunks({
        fileName,
        totalChunks,
        outputDir,
        chunkDir,
        extension,
        options,
      });
      return {
        success: true,
        message: "All chunks uploaded and merged successfully",
        mergedFilePath,
      };
    }

    return {
      success: true,
      message: `Chunk ${chunkNumber} uploaded successfully`,
    };
  } catch (err) {
    logMessage(
      `Error merging chunks: ${(err as Error).message}`,
      true,
      options
    );
    return {
      success: false,
      message: (err as Error).message,
    };
  }
}

async function mergeChunks({
  fileName,
  totalChunks,
  outputDir,
  chunkDir,
  extension,
  options,
}: {
  fileName: string;
  totalChunks: number;
  outputDir: string;
  chunkDir: string;
  extension: string;
  options?: { debugMode?: boolean };
}): Promise<string> {
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  const finalFilePath = path.join(outputDir, `${fileName}${extension}`);
  logMessage(`Merging chunks into: ${finalFilePath}`, false, options);

  return new Promise((resolve, reject) => {
    const writeStream = createWriteStream(finalFilePath);
    let currentChunk = 0;

    writeStream.on("error", (err) => {
      logMessage(`Error writing to final file: ${err}`, true, options);
      reject(err);
    });

    writeStream.on("finish", () => {
      logMessage("Merging completed successfully!", false, options);
      resolve(finalFilePath);
    });

    const mergeNextChunk = () => {
      if (currentChunk < totalChunks) {
        const chunkFilePath = path.join(
          chunkDir,
          `${fileName}.part_${currentChunk}`
        );

        try {
          if (!existsSync(chunkFilePath))
            throw new Error(`Missing chunk file: ${chunkFilePath}`);

          const chunkBuffer = readFileSync(chunkFilePath);
          writeStream.write(chunkBuffer, () => {
            unlinkSync(chunkFilePath);
            currentChunk++;
            mergeNextChunk();
          });
        } catch (err) {
          logMessage(`Error processing chunk: ${err}`, true, options);
          writeStream.destroy();
          reject(err);
        }
      } else {
        writeStream.end();
      }
    };

    mergeNextChunk();
  });
}

export { saveChunk };
