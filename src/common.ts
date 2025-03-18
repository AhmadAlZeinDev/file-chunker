export interface Logger {
  options?: {
    debugMode?: boolean;
  };
}

export function logMessage(
  message: string,
  isError: boolean = false,
  options?: { debugMode?: boolean }
) {
  if (options?.debugMode) {
    isError ? console.error(message) : console.log(message);
  }
}