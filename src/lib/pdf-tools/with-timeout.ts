// Shared safety net for any pdf.js operation that could, in principle,
// never resolve (a worker that stops responding, a pathological content
// stream). Used by both thumbnails.ts and export-images.ts around
// page.render() calls — without this, a stuck render leaves the user
// staring at "Please don't close this page" forever instead of a clear,
// actionable error.
export function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}
