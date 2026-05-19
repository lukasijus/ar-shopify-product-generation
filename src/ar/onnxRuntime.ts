import type * as Ort from "onnxruntime-web";

export const configureOnnxRuntime = (ort: typeof Ort): void => {
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.wasmPaths = {
    wasm: "/vendor/onnxruntime/ort-wasm-simd-threaded.jsep.wasm",
  };
};
