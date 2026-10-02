let engine;
export async function initializeEngine(bytes) {
  const { instance } = await WebAssembly.instantiate(bytes, {});
  engine = instance.exports;
}
export function cEngine() {
  if (!engine) throw new Error('C engine has not been initialized.');
  return engine;
}
