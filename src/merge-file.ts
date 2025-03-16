import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "fs";
import path from "path";

interface File {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: any;
  size: number;
}

export interface SaveChunkOptions {
  file: File;
  chunkNumber: number;
  totalChunks: number;
  outputDir?: string;
  chunkDir?: string;
}

async function saveChunk({
  file,
  chunkNumber,
  totalChunks,
  outputDir = "./uploads",
  chunkDir = "./uploads/chunks",
}: SaveChunkOptions) {
  const extension = path.extname(file.originalname);
  const fileName = path.basename(file.originalname, extension);
  chunkNumber = Number(chunkNumber);
  totalChunks = Number(totalChunks);

  chunkDir = path.resolve(chunkDir);
  outputDir = path.resolve(outputDir);

  if (!existsSync(chunkDir)) mkdirSync(chunkDir, { recursive: true });

  const chunkFilePath = path.join(chunkDir, `${fileName}.part_${chunkNumber}`);
  writeFileSync(chunkFilePath, file.buffer as Buffer);

  console.log(
    `Chunk ${chunkNumber}/${totalChunks - 1} saved: ${chunkFilePath}`
  );

  if (chunkNumber === totalChunks - 1) {
    const mergedFilePath = await mergeChunks({
      fileName,
      totalChunks,
      outputDir,
      chunkDir,
      extension,
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
}

async function mergeChunks({
  fileName,
  totalChunks,
  outputDir,
  chunkDir,
  extension,
}: {
  fileName: string;
  totalChunks: number;
  outputDir: string;
  chunkDir: string;
  extension: string;
}): Promise<string> {
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  const finalFilePath = path.join(outputDir, `${fileName}${extension}`);
  console.log(`Merging chunks into: ${finalFilePath}`);

  return new Promise((resolve, reject) => {
    const writeStream = createWriteStream(finalFilePath);
    let currentChunk = 0;

    writeStream.on("error", (err) => {
      console.error("Error writing to final file:", err);
      reject(err);
    });

    writeStream.on("finish", () => {
      console.log("Merging completed successfully!");
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
          console.error("Error processing chunk:", err);
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
