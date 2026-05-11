// Polyfill Promise.withResolvers at module scope so it's available before
// any dependency (e.g. pdfjs-dist) is evaluated. Node <22 lacks this method.
if (typeof Promise.withResolvers === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Promise as any).withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

export async function register() {
  // polyfill already applied above at module load time
}
