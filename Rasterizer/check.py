from PIL import Image
from PIL import ImageChops

image_one = Image.open("test/rast-gray.png")
image_two = Image.open("gray.png")

diff = ImageChops.difference(image_one, image_two)

if diff.getbbox():
    print("images are different")
else:
    print("images are the same")

image_one = Image.open("test/rast-smallgap.png")
image_two = Image.open("smallgap.png")

diff = ImageChops.difference(image_one, image_two)

if diff.getbbox():
    print("images are different")
else:
    print("images are the same")

image_one = Image.open("test/rast-smoothcolor.png")
image_two = Image.open("smoothcolor.png")

diff = ImageChops.difference(image_one, image_two)

if diff.getbbox():
    print("images are different")
else:
    print("images are the same")

image_one = Image.open("test/rast-checkers.png")
image_two = Image.open("checkers.png")

diff = ImageChops.difference(image_one, image_two)

if diff.getbbox():
    print("images are different")
else:
    print("images are the same")

image_one = Image.open("test/rast-depth.png")
image_two = Image.open("depth.png")

diff = ImageChops.difference(image_one, image_two)

if diff.getbbox():
    print("images are different")
else:
    print("images are the same")

image_one = Image.open("test/rast-oldlogo.png")
image_two = Image.open("oldlogo.png")

diff = ImageChops.difference(image_one, image_two)

if diff.getbbox():
    print("images are different")
else:
    print("images are the same")

image_one = Image.open("test/rast-sRGB.png")
image_two = Image.open("sRGB.png")

diff = ImageChops.difference(image_one, image_two)

if diff.getbbox():
    print("images are different")
else:
    print("images are the same")

image_one = Image.open("test/rast-gammabox.png")
image_two = Image.open("gammabox.png")

diff = ImageChops.difference(image_one, image_two)

if diff.getbbox():
    print("images are different")
else:
    print("images are the same")