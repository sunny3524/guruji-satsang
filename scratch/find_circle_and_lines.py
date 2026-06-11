from PIL import Image

img = Image.open('src/assets/images/invite_bg.png')
w, h = img.size
rgb = img.convert('RGB')

# Let's find the circular frame.
# The frame is in the top half (y between 100 and 450) and centered horizontally (x between w/4 and 3*w/4).
# Gold pixels have high R and G, and lower B. Let's find gold-ish pixels.
gold_pixels = []
for y in range(100, 450):
    for x in range(int(w*0.3), int(w*0.7)):
        r, g, b = rgb.getpixel((x, y))
        # Gold threshold: R > 150, G > 120, B < 100
        if r > 120 and g > 90 and b < 80:
            gold_pixels.append((x, y))

if gold_pixels:
    min_x = min(p[0] for p in gold_pixels)
    max_x = max(p[0] for p in gold_pixels)
    min_y = min(p[1] for p in gold_pixels)
    max_y = max(p[1] for p in gold_pixels)
    cx = (min_x + max_x) / 2
    cy = (min_y + max_y) / 2
    rx = (max_x - min_x) / 2
    ry = (max_y - min_y) / 2
    print(f"Detected Gold Frame Area (576x1024):")
    print(f"  Bounding Box: X: [{min_x}, {max_x}], Y: [{min_y}, {max_y}]")
    print(f"  Center: ({cx:.1f}, {cy:.1f}), Radius: X={rx:.1f}, Y={ry:.1f}")
    
    # Let's scale to 360x640
    print(f"Scaled to 360x640:")
    print(f"  Bounding Box: X: [{min_x*0.625:.1f}, {max_x*0.625:.1f}], Y: [{min_y*0.625:.1f}, {max_y*0.625:.1f}]")
    print(f"  Center: ({cx*0.625:.1f}, {cy*0.625:.1f}), Radius: X={rx*0.625:.1f}, Y={ry*0.625:.1f}")
else:
    print("No gold frame pixels found.")

# Now let's print the vertical profile in detail for y from 400 to 1024 to find the exact horizontal dividers.
print("\nHorizontal Dividers Detection (y from 400 to 1000):")
row_goldness = []
for y in range(400, 1000):
    gold_count = 0
    for x in range(int(w*0.25), int(w*0.75)):
        r, g, b = rgb.getpixel((x, y))
        # Gold threshold
        if r > 100 and g > 80 and b < 90:
            gold_count += 1
    row_goldness.append((y, gold_count))

# Find peaks in row_goldness
peaks = []
for i in range(5, len(row_goldness) - 5):
    y, count = row_goldness[i]
    # Check if local max
    is_max = True
    for di in range(-5, 6):
        if di != 0 and row_goldness[i + di][1] >= count:
            is_max = False
            break
    if is_max and count > 10:
        peaks.append((y, count))

print("Detected gold line dividers:")
for y, count in peaks:
    scaled_y = y * 0.625
    print(f"  y={y:3d} (scaled={scaled_y:.1f}px): goldness={count}")
