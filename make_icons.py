from PIL import Image, ImageDraw
import os

os.makedirs(r"C:\Users\jalek\OneDrive\Masaüstü\kuran_app\apps\mobile\assets", exist_ok=True)
base = r"C:\Users\jalek\OneDrive\Masaüstü\kuran_app\apps\mobile\assets"

def kaaba_icon(size, bg="#059669"):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = int(size * 0.18)
    d.rounded_rectangle([0, 0, size, size], radius=r, fill=bg)
    kw = int(size * 0.55)
    kh = int(size * 0.50)
    kx = (size - kw) // 2
    ky = int(size * 0.28)
    d.rectangle([kx, ky, kx + kw, ky + kh], fill="white")
    sh = int(kh * 0.18)
    d.rectangle([kx, ky + sh, kx + kw, ky + sh * 2], fill="#fbbf24")
    dw = int(kw * 0.22)
    dh = int(kh * 0.40)
    dx = kx + (kw - dw) // 2
    dy = ky + kh - dh
    d.rectangle([dx, dy, dx + dw, dy + dh], fill=bg)
    return img

icon = kaaba_icon(1024)
icon.save(base + r"\icon.png")
icon.save(base + r"\adaptive-icon.png")

splash = Image.new("RGB", (2048, 2048), "white")
sm = kaaba_icon(320)
splash.paste(sm, ((2048 - 320) // 2, (2048 - 320) // 2), sm)
splash.save(base + r"\splash.png")

print("done")
