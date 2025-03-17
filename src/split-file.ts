export interface SplitFileOptions {
  file: File;
  chunkSize?: number;
}

function generateUUID(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

async function* splitFile({
  file,
  chunkSize = 5 * 1024 * 1024,
}: SplitFileOptions) {
  const totalChunks = Math.ceil(file.size / chunkSize);
  const fileName = `${generateUUID()}.${
    file ? file.name.split(".").pop() : "file"
  }`;
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
}

export { splitFile };
