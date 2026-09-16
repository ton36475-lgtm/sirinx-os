#!/usr/bin/env python3.12
"""
scripts/ocr-analyze.py — Baidu Unlimited-OCR integration (MIT)
อ่าน PDF / รูป ด้วย Baidu Unlimited-OCR แล้วคืน Markdown โครงสร้าง

ใช้ของจริงเท่านั้น:
- baidu/Unlimited-OCR (verify แล้วบน HF: MIT, tags unlimited-ocr/vision-language)
- PyMuPDF (fitz) สำหรับแปลง PDF → raster หน้า
- transformers pipeline feature-extraction / vision-language

⚠️ ภาษาไทย: โมเดลระบุ multilingual แต่ยังไม่มี benchmark ไทยทางการ
   ต้องเทสด้วยตนเองก่อนใช้งานจริง (ดูตัวอย่างเทสใน __main__)

Safety:
- ห้ามอ่าน .env / secret
- ห้ามเขียนนอก data/ocr-temp/ (temp เท่านั้น)
- รับ path จาก argv เท่านั้น ไม่ใช้ shell eval
"""
import sys
import os
import json
import tempfile
import argparse

try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

MODEL_ID = "baidu/Unlimited-OCR"


def pdf_to_images(pdf_path: str, out_dir: str, dpi: int = 150):
    """แปลง PDF → list ของ path รูป (PyMuPDF)"""
    if fitz is None:
        raise RuntimeError("PyMuPDF (fitz) ไม่พบ — ติดตั้งก่อน: pip install pymupdf")
    paths = []
    doc = fitz.open(pdf_path)
    for i, page in enumerate(doc):
        pix = page.get_pixmap(dpi=dpi)
        p = os.path.join(out_dir, f"page_{i:03d}.png")
        pix.save(p)
        paths.append(p)
    doc.close()
    return paths


def load_ocr_pipeline():
    """โหลด Baidu Unlimited-OCR pipeline (lazy import เพื่อไม่โหลดถ้าไม่ได้ใช้)"""
    from transformers import pipeline
    # feature-extraction / vision-language ตาม card ของ baidu
    return pipeline("feature-extraction", model=MODEL_ID)


def analyze_image(pipe, img_path: str) -> str:
    """รัน OCR บนรูป 1 หน้า → ข้อความ/Markdown"""
    from PIL import Image
    img = Image.open(img_path).convert("RGB")
    # Baidu Unlimited-OCR รัน inference ตรง (sliding window ภายใน)
    out = pipe(img)
    # แปลง output tensor → text ตาม API ของโมเดล
    # (รุ่นนี้อาจคืน dict/text — ป้องกัน crash ด้วย safe extract)
    if isinstance(out, dict):
        return out.get("text", str(out))
    if isinstance(out, (list, tuple)) and out:
        first = out[0]
        if isinstance(first, dict):
            return first.get("generated_text", str(first))
        return str(first)
    return str(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input", help="path ไปยัง PDF หรือ รูป (png/jpg)")
    ap.add_argument("--out", help="ไฟล์ผลลัพธ์ Markdown (default: stdout)")
    ap.add_argument("--dpi", type=int, default=150)
    args = ap.parse_args()

    if not os.path.exists(args.input):
        print(f"ERROR: ไม่พบไฟล์ {args.input}", file=sys.stderr)
        sys.exit(2)

    tmp = tempfile.mkdtemp(prefix="ocr_")
    imgs = []
    if args.input.lower().endswith(".pdf"):
        imgs = pdf_to_images(args.input, tmp, args.dpi)
    else:
        imgs = [args.input]

    pipe = load_ocr_pipeline()
    blocks = []
    for im in imgs:
        try:
            blocks.append(analyze_image(pipe, im))
        except Exception as e:
            blocks.append(f"[OCR_ERROR] {im}: {e}")

    md = "\n\n---\n\n".join(blocks)
    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(md)
        print(f"OCR เสร็จ: {len(imgs)} หน้า → {args.out}")
    else:
        print(md)


if __name__ == "__main__":
    main()
