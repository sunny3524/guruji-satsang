from PIL import Image

img = Image.open('src/assets/images/invite_bg.png')
w, h = img.size
gray = img.convert('L')

# Sample row values
left_col = int(w * 0.25)
right_col = int(w * 0.75)
sample_w = right_col - left_col

print(f"Image size: {w}x{h}")
row_profile = []
for y in range(h):
    row_sum = 0
    for x in range(left_col, right_col):
        row_sum += gray.getpixel((x, y))
    row_profile.append(row_sum / sample_w)

# Find local maxima (peaks) to identify horizontal dividers/lines
# Dividers should be brighter than their surroundings.
peaks = []
for y in range(10, h - 10):
    val = row_profile[y]
    # Check if local maximum in a window of 15 pixels
    is_max = True
    for dy in range(-7, 8):
        if dy != 0 and row_profile[y + dy] >= val:
            is_max = False
            break
    if is_max and val > 20: # Threshold for brightness
        peaks.append((y, val))

print("\nDetected Bright Peaks (potential lines/dividers/frames):")
for y, val in peaks:
    print(f"y={y:3d} (relative y/h={y/h:.3f}): brightness={val:.1f}")

# Also print row values in sections
print("\nProfile Sample:")
for y in range(0, h, 10):
    bar = "*" * int(row_profile[y] / 4)
    print(f"y={y:3d}: {row_profile[y]:5.1f} {bar}")
