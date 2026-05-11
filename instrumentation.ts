export async function register() {
  // Promise.withResolvers was added in Node 22. Polyfill it for older runtimes
  // so pdfjs-dist doesn't crash during server-side prerendering.
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
}
