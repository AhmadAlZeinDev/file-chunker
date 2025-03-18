# file-chunkify

A lightweight file chunking utility for splitting and merging large files across different environments.

## Features

- Efficiently splits large files into smaller chunks.
- Supports progressive chunk uploading.
- Merges chunks back into a single file upon completion.
- Compatible with various runtime environments.

## Installation

Install via npm:

```sh
npm install file-chunkify
```

## Usage

### **File Splitting**

Use `splitFile` to break a large file into chunks before processing:

```ts
import { splitFile } from "file-chunkify";

const fileInput = document.querySelector("input[type='file']");
fileInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  for await (const chunkInfo of splitFile({
    file,
    chunkSize: 5 * 1024 * 1024,
  })) {
    console.log("Processing chunk", chunkInfo);
    // Send chunkInfo.chunk to the storage or processing pipeline
  }
});
```

### **Chunk Storage & Merging**

Use `saveChunk` to store received chunks and merge them when all are received:

```ts
import { saveChunk } from "file-chunkify";
import express from "express";
import multer from "multer";

const app = express();
const upload = multer();

app.post("/upload", upload.single("chunk"), async (req, res) => {
  const { chunkNumber, totalChunks } = req.body;
  const result = await saveChunk({
    file: req.file,
    chunkNumber: Number(chunkNumber),
    totalChunks: Number(totalChunks),
    options: { debugMode: true }, // Example usage of debugger
  });
  res.json(result);
});

app.listen(3000, () => console.log("Server running on port 3000"));
```

## API Reference

### **splitFile(options)**

Splits a file into chunks.

#### **Parameters:**

| Name      | Type   | Default  | Description                           |
| --------- | ------ | -------- | ------------------------------------- |
| file      | File   | Required | The file to be split.                 |
| chunkSize | number | 5MB      | The size of each chunk.               |
| options   | object | Optional | Additional options, including logger. |

#### **Returns:**

An async generator yielding objects with:

- `chunk`: A file slice (File)
- `chunkNumber`: The current chunk number
- `totalChunks`: Total number of chunks
- `fileName`: A generated UUID-based file name
- `progress`: Split progress in %

---

### **saveChunk(options)**

Saves uploaded chunks and merges them when all are received.

#### **Parameters:**

| Name        | Type                | Default          | Description                              |
| ----------- | ------------------- | ---------------- | ---------------------------------------- |
| file        | Express.Multer.File | Required         | The uploaded chunk file.                 |
| chunkNumber | number              | Required         | The current chunk number.                |
| totalChunks | number              | Required         | The total number of chunks.              |
| outputDir   | string              | ./uploads        | Directory to store merged files.         |
| chunkDir    | string              | ./uploads/chunks | Directory to store chunk files.          |
| options     | object              | Optional         | Additional options, including debugMode. |

#### **Returns:**

| Name           | Type    | Description                                  |
| -------------- | ------- | -------------------------------------------- |
| success        | boolean | Indicates if the operation was successful.   |
| message        | string  | A status message.                            |
| mergedFilePath | string? | The path of the merged file (if applicable). |

## License

MIT License © 2025 Ahmad Al-Zein
