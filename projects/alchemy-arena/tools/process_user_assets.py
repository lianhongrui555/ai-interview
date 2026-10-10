from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

MAPPING = {
    "778c9a6a369de9e8840abec0bc423755.jpg": ("cards", "unit_archer.png", 128),
    "5db4166717f5c1576dd5333d417184e9.jpg": ("cards", "unit_anvil.png", 128),
    "b3f610623e01844062736b7b66cb22bf.jpg": ("cards", "unit_spore.png", 128),
    "66aa3c47b361ea455dfac5de07194b74.jpg": ("cards", "unit_griffin.png", 128),
    "68cfa18b1d13ee08cb9e6b2f898ad5c7.jpg": ("cards", "building_cannon.png", 128),
    "b67ee929c7d43ed15ae5884b05ca12b4.jpg": ("cards", "spell_flame.png", 128),
    "ee3e9374de4f274236c982a4f495d016.jpg": ("cards", "spell_frost.png", 128),
    "e6a69adb8837ceeed673f45b2455df25.jpg": ("cards", "catalyst_order.png", 128),
    "a3064eff53c16bdfaa9169382576d209.jpg": ("towers", "tower_king_player.png", 160),
    "decacb49f4a3f233aa7a65849b0da0d0.jpg": ("towers", "tower_guard_player.png", 160),
    "76d4b328b2b80789ba4b22494c9a763f.jpg": ("cards", "unit_charger.png", 128),
    "73d8587e5951a9f8ec83599ca4cb8e31.jpg": ("cards", "building_spring.png", 128),
    "5e40aa4384812a372c6d03751615d89b.jpg": ("cards", "spell_growth.png", 128),
    "36af211c19441a8c6a8ae4153355414e.jpg": ("cards", "trap_mire.png", 128),
    "8682d34bb1ba5814bdd5a62bffdd909d.jpg": ("cards", "catalyst_chaos.png", 128),
    "23148efe6d83e1ff52543711d30ad453.jpg": ("cards", "trap_rune.png", 128),
}


def remove_background(image: Image.Image) -> Image.Image:
    rgb = np.asarray(image.convert("RGB"), dtype=np.int16)
    spread = rgb.max(axis=2) - rgb.min(axis=2)
    minimum = rgb.min(axis=2)
    candidate = (spread <= 34) & (minimum >= 172)

    labels, _ = ndimage.label(candidate, structure=np.ones((3, 3), dtype=np.uint8))
    border_labels = np.unique(np.concatenate([
        labels[0, :], labels[-1, :], labels[:, 0], labels[:, -1],
    ]))
    border_labels = border_labels[border_labels != 0]
    background = np.isin(labels, border_labels)

    height, width = background.shape
    watermark = np.zeros_like(background)
    watermark[int(height * 0.855):, int(width * 0.775):] = True

    alpha = np.where(background | watermark, 0, 255).astype(np.uint8)
    rgba = np.dstack([np.asarray(image.convert("RGB")), alpha])
    return Image.fromarray(rgba, "RGBA")


def trim_and_fit(image: Image.Image, size: int, padding: int = 6) -> Image.Image:
    alpha = np.asarray(image.getchannel("A"))
    ys, xs = np.where(alpha > 20)
    if len(xs) == 0 or len(ys) == 0:
        raise ValueError("背景移除后没有剩余主体")
    image = image.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))

    max_content = size - padding * 2
    ratio = min(max_content / image.width, max_content / image.height)
    target = (max(1, round(image.width * ratio)), max(1, round(image.height * ratio)))
    image = image.resize(target, Image.Resampling.LANCZOS)
    pixels = np.asarray(image).copy()
    pixels[:, :, 3] = np.where(pixels[:, :, 3] >= 44, 255, 0)
    image = Image.fromarray(pixels, "RGBA")

    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(image, ((size - image.width) // 2, (size - image.height) // 2))
    return canvas


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    source = Path(args.source)
    output = Path(args.output)
    for filename, (folder, output_name, size) in MAPPING.items():
        source_path = source / filename
        if not source_path.exists():
            raise FileNotFoundError(source_path)
        processed = trim_and_fit(remove_background(Image.open(source_path)), size)
        destination = output / folder / output_name
        destination.parent.mkdir(parents=True, exist_ok=True)
        processed.save(destination, "PNG", optimize=True)
        print(f"{filename} -> {destination}")


if __name__ == "__main__":
    main()


