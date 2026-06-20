#!/usr/bin/env python3
"""
resize_glb_textures.py — downscale embedded textures in a GLB to fit a web budget.

Meshy refine embeds full-res (~2K) PBR JPEGs, which makes a single asset ~8 MiB —
far over a sane browser payload. Game props don't need 2K maps; 1024 (or less) is
plenty. This repacks the GLB binary chunk with resized images and recomputed
bufferView offsets, leaving mesh/accessor data byte-identical.

Usage:
  python resize_glb_textures.py in.glb out.glb [--max 1024] [--quality 85]
"""
import argparse
import json
import struct
import sys
from io import BytesIO

from PIL import Image


def _align4(n):
    return (n + 3) & ~3


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--max", type=int, default=1024, help="longest texture side (px)")
    ap.add_argument("--quality", type=int, default=85, help="JPEG quality")
    a = ap.parse_args()

    data = open(a.src, "rb").read()
    if data[:4] != b"glTF":
        sys.exit("not a GLB")
    total = struct.unpack("<I", data[8:12])[0]

    # Walk chunks
    off = 12
    json_bytes = bin_bytes = None
    while off < total:
        clen = struct.unpack("<I", data[off:off + 4])[0]
        ctype = data[off + 4:off + 8]
        cdata = data[off + 8:off + 8 + clen]
        if ctype == b"JSON":
            json_bytes = cdata
        elif ctype == b"BIN\x00":
            bin_bytes = cdata
        off += 8 + clen
    if json_bytes is None or bin_bytes is None:
        sys.exit("missing JSON or BIN chunk")

    js = json.loads(json_bytes)
    image_bvs = {im["bufferView"] for im in js.get("images", []) if "bufferView" in im}

    # Extract each bufferView's bytes (single-buffer GLB assumed), resizing images.
    bvs = js["bufferViews"]
    new_chunks = []
    before = after = 0
    for idx, bv in enumerate(bvs):
        start = bv.get("byteOffset", 0)
        seg = bin_bytes[start:start + bv["byteLength"]]
        if idx in image_bvs:
            im = Image.open(BytesIO(seg))
            before += len(seg)
            w, h = im.size
            scale = a.max / max(w, h)
            if scale < 1.0:
                im = im.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
            buf = BytesIO()
            im.convert("RGB").save(buf, format="JPEG", quality=a.quality, optimize=True)
            seg = buf.getvalue()
            after += len(seg)
        new_chunks.append(seg)

    # Repack BIN with 4-byte alignment, rewriting bufferView offsets.
    new_bin = bytearray()
    for idx, bv in enumerate(bvs):
        pad = _align4(len(new_bin)) - len(new_bin)
        new_bin += b"\x00" * pad
        bv["byteOffset"] = len(new_bin)
        bv["byteLength"] = len(new_chunks[idx])
        new_bin += new_chunks[idx]
    while len(new_bin) % 4:
        new_bin += b"\x00"
    js["buffers"][0]["byteLength"] = len(new_bin)

    # Re-emit GLB
    new_json = json.dumps(js, separators=(",", ":")).encode()
    while len(new_json) % 4:
        new_json += b" "
    body = bytearray()
    body += struct.pack("<I", len(new_json)) + b"JSON" + new_json
    body += struct.pack("<I", len(new_bin)) + b"BIN\x00" + new_bin
    out = b"glTF" + struct.pack("<II", 2, 12 + len(body)) + bytes(body)
    open(a.dst, "wb").write(out)
    print(f"images {before/1024:.0f} KiB -> {after/1024:.0f} KiB; "
          f"GLB {len(data)/1024:.0f} KiB -> {len(out)/1024:.0f} KiB")


if __name__ == "__main__":
    main()
