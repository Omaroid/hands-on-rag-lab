import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import {copyFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
function copyRuntime(target:string){mkdirSync(target,{recursive:true});for(const suffix of ['.mjs','.wasm'])for(const variant of ['', '.jsep', '.asyncify']){const file=`ort-wasm-simd-threaded${variant}${suffix}`;copyFileSync(resolve('node_modules/onnxruntime-web/dist',file),resolve(target,file));}}
export default defineConfig({plugins:[react(),{name:'local-onnx-runtime',buildStart(){copyRuntime(resolve('public/onnx'));}}],worker:{format:'es'},server:{proxy:{'/api':'http://127.0.0.1:8000'}}});
