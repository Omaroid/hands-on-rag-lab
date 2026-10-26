# Notices

The distributed runtime assets originate from the exact packages in package-lock.json:

- PDF.js (`pdfjs-dist` 6.4.299), Mozilla and contributors, Apache-2.0.
- Tesseract.js 7.0.0, Apache-2.0; Tesseract.js Core includes Tesseract/Leptonica notices
  in tesseract-core.txt.
- @tesseract.js-data/eng and /fra 1.0.0, npm metadata declares MIT;
  trained data originate from https://github.com/naptha/tessdata and Tesseract data.
- Transformers.js 4.3.1, Hugging Face and contributors, Apache-2.0.
- ONNX Runtime Web, Microsoft Corporation, MIT. License reproduced in onnxruntime.txt.
  Package revision: 8d85527a010e294a26b274749f74294b2a32cec5.

Public multilingual E5 model files are fetched from Hugging Face on demand, not bundled.
Original model card declares MIT: https://huggingface.co/intfloat/multilingual-e5-small.
Conversion revision and file checksums: docs/PDF_RAG.md and evidence/pdf-model-manifest.json.
No generative model weights are distributed.

## shadcn/ui

Button, Card, Tabs, Accordion and Badge are adapted from the official shadcn/ui
new-york-v4 registry (MIT license), fetched from
https://github.com/shadcn-ui/ui/tree/main/apps/v4/registry/new-york-v4/ui .
Copyright (c) 2023 shadcn. Component source is owned and maintained in src/components/ui.
Radix UI supplies accessible interaction primitives; Lucide supplies MIT-licensed icons.
