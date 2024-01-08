import sys
from PIL import Image
import numpy as np
import math

# Define the initial image dimensions and background color
width = None
height = None
image = None
filename = None
elements = []
depth = False
srgb = False

# Define buffers for positions and colors
positions = [] # Array of values, [x,y,x,w]
colors = [] # Array of values, [r,g,b,a] values between [0,1]

def create_image(width, height):
    return Image.new("RGBA", (width, height), (0, 0, 0, 0))

def draw_pixels(im, p, c):
    global width, height, image, positions, colors, filename

    pixels = im.load()
    for pos, color in zip(p, c):
        x, y, _, _ = pos
        r, g, b, a = color
        pixels[x, y] = (r, g, b, a)

def linear_to_srgb(color):
    if color <= 0.0031308:
        return 12.92 * color
    else:
        return 1.055 * (color ** (1/2.4)) - 0.055


def drawArraysTriangles(first, count, depth):
    global positions, colors, width, height, image
    def dda(p1, p2, d):
        if p1[d] == p2[d]:
            return []
        if p1[d] > p2[d]:
            p1, p2 = p2, p1

        delta = np.array(p2) - np.array(p1)
        s = delta / delta[d]

        e = math.ceil(p1[d]) - p1[d]
        o = e * s
        p = np.array(p1) + o

        points = []
        while p[d] < p2[d]:
            points.append(p.copy())
            p += s
        return points

    if depth:
        depth_buffer = [[float('inf')] * width for _ in range(height)]

    for i in range(first, first + count, 3):
        pos = [list(positions[i]), list(positions[i + 1]), list(positions[i + 2])]
        col = [list(colors[i]), list(colors[i + 1]), list(colors[i + 2])]

        for p in pos:
            p[0] = (p[0] / p[3] + 1) * width / 2
            p[1] = (p[1] / p[3] + 1) * height / 2

        combined_vectors = [pp + cc for pp, cc in zip(pos, col)]
        sorted_pos = sorted(combined_vectors, key=lambda x: x[1])
        t, m, b = sorted_pos

        long_edge_points = dda(t, b, 1)

        top_half_points = dda(t, m, 1)
        for p_top in top_half_points:
            if p_top[1] >= m[1]:
                break
            corresponding_long_point = next((p for p in long_edge_points if p[1] == p_top[1]), None)
            if corresponding_long_point is not None:
                line_points = dda(p_top, corresponding_long_point, 0)
                for px in line_points:
                    x, y, z = int(px[0]), int(px[1]), px[2]
                    r, g, bb, a = px[4], px[5], px[6], px[7]
                    if (srgb):
                        r = int(linear_to_srgb(r) * 255)
                        g = int(linear_to_srgb(g) * 255)
                        bb = int(linear_to_srgb(bb) * 255)
                        a = int(a * 255)
                    else:
                        r, g, bb, a = int(r * 255), int(g * 255), int(bb * 255), int(a * 255)
                    if 0 <= x < width and 0 <= y < height and (not depth or z < depth_buffer[y][x]):
                        image.putpixel((x, y), (r, g, bb, a))
                        if depth:
                            depth_buffer[y][x] = z

        bottom_half_points = dda(m, b, 1)
        for p_bot in bottom_half_points:
            corresponding_long_point = next((p for p in long_edge_points if p[1] == p_bot[1]), None)
            if corresponding_long_point is not None:
                line_points = dda(p_bot, corresponding_long_point, 0)
                for px in line_points:
                    x, y, z = int(px[0]), int(px[1]), px[2]
                    r, g, bb, a = px[4], px[5], px[6], px[7]
                    if (srgb):
                        r = int(linear_to_srgb(r) * 255)
                        g = int(linear_to_srgb(g) * 255)
                        bb = int(linear_to_srgb(bb) * 255)
                        a = int(a * 255)
                    else:
                        r, g, bb, a = int(r * 255), int(g * 255), int(bb * 255), int(a * 255)


                    if 0 <= x < width and 0 <= y < height and (not depth or z < depth_buffer[y][x]):
                        image.putpixel((x, y), (r, g, bb, a))
                        if depth:
                            depth_buffer[y][x] = z
        
def drawElementsTriangles(count, offset):
    global positions, colors, width, height, image, elements
    def dda(p1, p2, d):
        if p1[d] == p2[d]:
            return []
        if p1[d] > p2[d]:
            p1, p2 = p2, p1

        delta = np.array(p2) - np.array(p1)
        s = delta / delta[d]

        e = math.ceil(p1[d]) - p1[d]
        o = e * s
        p = np.array(p1) + o

        points = []
        while p[d] < p2[d]:
            points.append(p.copy())
            p += s
        return points

    for i in range(offset, offset + count, 3):
        pos = [list(positions[elements[i]]), list(positions[elements[i + 1]]), list(positions[elements[i + 2]])]
        col = [list(colors[elements[i]]), list(colors[elements[i + 1]]), list(colors[elements[i + 2]])]
        for p in pos:
            p[0] = (p[0] / p[3] + 1) * width / 2
            p[1] = (p[1] / p[3] + 1) * height / 2

        combined_vectors = [pp + cc for pp, cc in zip(pos, col)]

        sorted_pos = sorted(combined_vectors, key=lambda x: x[1])
        t, m, b = sorted_pos

        long_edge_points = dda(t, b, 1)  # 1 is y-axis

        top_half_points = dda(t, m, 1)
        for p_top in top_half_points:
            if p_top[1] >= m[1]:
                break
            corresponding_long_point = next((p for p in long_edge_points if p[1] == p_top[1]), None)
            if corresponding_long_point is not None:
                line_points = dda(p_top, corresponding_long_point, 0)  # 0 is x-axis
                for px in line_points:
                    x, y = int(px[0]), int(px[1])
                    r, g, bb, a = int(px[4] * 255), int(px[5] * 255), int(px[6] * 255), int(px[7] * 255)
                    if 0 <= x < width and 0 <= y < height:
                        image.putpixel((x, y), (r, g, bb, a)) 

        bottom_half_points = dda(m, b, 1)
        for p_bot in bottom_half_points:
            corresponding_long_point = next((p for p in long_edge_points if p[1] == p_bot[1]), None)
            if corresponding_long_point is not None:
                line_points = dda(p_bot, corresponding_long_point, 0)  # 0 is x-axis
                for px in line_points:
                    x, y = int(px[0]), int(px[1])
                    r, g, bb, a = int(px[4] * 255), int(px[5] * 255), int(px[6] * 255), int(px[7] * 255)
                    if 0 <= x < width and 0 <= y < height:
                        image.putpixel((x, y), (r, g, bb, a))
    
def process_line(line):
    global width, height, image, positions, colors, filename, elements, depth, srgb

    line = line.strip()

    if not line or line.startswith("#"):
        return

    args = line.split()

    if not args:
        return

    keyword = args[0]

    if keyword == "png":
        width, height, output_filename = map(str, args[1:])
        width, height = int(width), int(height)
        image = create_image(width, height)
        filename = output_filename

    elif keyword == "position":
        size = int(args[1])
        numbers = [float(arg) for arg in args[2:]]

        if len(numbers) % size != 0:
            print("Error: Number of coordinates is not a multiple of the specified size")
            return

        if positions:
            positions = []

        for i in range(0, len(numbers), size):
            if size == 1:
                positions.append([numbers[i], 0, 0, 1])
            elif size == 2:
                positions.append([numbers[i], numbers[i + 1], 0, 1])
            elif size == 3:
                positions.append([numbers[i], numbers[i + 1], numbers[i + 2], 1])
            elif size == 4:
                positions.append([numbers[i], numbers[i + 1], numbers[i + 2], numbers[i + 3]])


    elif keyword == "color":
        size = int(args[1])
        numbers = [float(arg) for arg in args[2:]]
        
        if len(numbers) % size != 0:
            print("Error: Number of colors is not a multiple of the specified size")
            return
        
        if (colors):
            colors = []

        for i in range(0, len(numbers), size):
            if size == 3:
                colors.append([numbers[i], numbers[i + 1], numbers[i + 2], 1])
            elif size == 4:
                colors.append([numbers[i], numbers[i + 1], numbers[i + 2], numbers[i + 3]])

    elif keyword == "drawPixels":
        n = int(args[1])
        if image is not None:
            draw_pixels(image, positions[:n], colors[:n])
    
    elif keyword == "drawArraysTriangles":
        first = int(args[1])
        count = int(args[2])
        if (count % 3 != 0):
            print("Count must be divisible by 3")
        else:
            drawArraysTriangles(first, count, depth)

    elif keyword == "elements":
        elements = [int(arg) for arg in args[1:]]

    elif keyword == "drawElementsTriangles":
        count = int(args[1])
        offset = int(args[2])
        if (count % 3 != 0):
            print("Count must be divisible by 3")
        else:
            drawElementsTriangles(count, offset)

    elif keyword == "depth":
        depth = True

    elif keyword == "sRGB":
        srgb = True

    else:
        print("Is not a Keyword: " + args[0])

def main(input_filename):
    with open(input_filename, "r") as file:
        for line in file:
            process_line(line)

    if image is not None:
        if filename is None:
            print("Error: No 'png' keyword found in the input file.")
            sys.exit(1)
        
        image.save(filename)
        print(f"Image saved as {filename}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python program.py input.txt")
        sys.exit(1)

    input_filename = sys.argv[1]
    main(input_filename)