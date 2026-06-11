from PIL import Image

img = Image.open('src/assets/images/invite_bg.png')
w, h = img.size
rgb = img.convert('RGB')

cx, cy = 287, 289
# Find the first non-gold (darker) pixel moving outward from the center (cx, cy)
# to detect the inner edge of the gold frame.
# Center of the frame is dark (inside the frame).
# Let's measure the distance from center to where it becomes gold (inner edge of frame).
inner_rx = 0
for x in range(cx, w):
    r, g, b = rgb.getpixel((x, cy))
    # If we hit gold (e.g. high R and G)
    if r > 120 and g > 95 and b < 100:
        inner_rx = x - cx
        break

inner_ry = 0
for y in range(cy, h):
    r, g, b = rgb.getpixel((cx, y))
    if r > 120 and g > 95 and b < 100:
        inner_ry = y - cy
        break

print(f"Detected Inner Frame Dimensions (576x1024):")
print(f"  Inner Radius X: {inner_rx}px, Inner Radius Y: {inner_ry}px")
print(f"  Inner Width: {inner_rx*2}px, Inner Height: {inner_ry*2}px")
print(f"  Inner Bounding Box: X: [{cx - inner_rx}, {cx + inner_rx}], Y: [{cy - inner_ry}, {cy + inner_ry}]")

print(f"\nScaled to 360x640:")
print(f"  Inner Radius X: {inner_rx*0.625:.1f}px, Inner Radius Y: {inner_ry*0.625:.1f}px")
print(f"  Inner Width: {inner_rx*2*0.625:.1f}px, Inner Height: {inner_ry*2*0.625:.1f}px")
print(f"  Inner Bounding Box: X: [{(cx - inner_rx)*0.625:.1f}, {(cx + inner_rx)*0.625:.1f}], Y: [{(cy - inner_ry)*0.625:.1f}, {(cy + inner_ry)*0.625:.1f}]")
