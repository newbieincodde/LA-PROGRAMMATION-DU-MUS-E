import os
import glob
from PIL import Image, ImageFilter, ImageOps

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMAGES_DIR = os.path.join(BASE_DIR, 'assets', 'images')
DEPTHS_DIR = os.path.join(BASE_DIR, 'assets', 'depths')

MAX_DIM = 1600
JPEG_QUALITY = 85

def optimize_image(img_path):
    try:
        filename = os.path.basename(img_path)
        base_name, ext = os.path.splitext(filename)
        if ext.lower() not in ('.jpg', '.jpeg', '.png', '.webp'):
            return False

        with Image.open(img_path) as im:
            orig_size = im.size
            orig_bytes = os.path.getsize(img_path)
            
            # Convert to RGB
            rgb_im = im.convert('RGB')
            w, h = rgb_im.size
            
            # Resize if exceeds max dimension
            if max(w, h) > MAX_DIM:
                if w > h:
                    new_w = MAX_DIM
                    new_h = int(h * (MAX_DIM / w))
                else:
                    new_h = MAX_DIM
                    new_w = int(w * (MAX_DIM / h))
                rgb_im = rgb_im.resize((new_w, new_h), Image.Resampling.LANCZOS)
                print(f"Resized {filename}: {orig_size} -> {rgb_im.size}")
            
            # Save optimized JPEG
            save_path = img_path
            if ext.lower() != '.jpg':
                save_path = os.path.join(IMAGES_DIR, f"{base_name}.jpg")
            
            rgb_im.save(save_path, 'JPEG', quality=JPEG_QUALITY, optimize=True)
            new_bytes = os.path.getsize(save_path)
            if orig_bytes > new_bytes:
                print(f"Optimized {filename}: {orig_bytes // 1024} KB -> {new_bytes // 1024} KB")

            # Generate / update corresponding depth map
            depth_path = os.path.join(DEPTHS_DIR, f"{base_name}.png")
            # Convert to grayscale
            gray = rgb_im.convert('L')
            # Gaussian blur for smooth shape gradients
            blurred = gray.filter(ImageFilter.GaussianBlur(radius=2.0))
            # Auto-contrast stretch
            depth_im = ImageOps.autocontrast(blurred, cutoff=2)
            depth_im.save(depth_path, 'PNG', optimize=True)
            print(f"Generated depth map: {base_name}.png ({depth_im.size})")

        return True
    except Exception as e:
        print(f"Error processing {img_path}: {e}")
        return False

def main():
    print("=== OPTIMIZING ALL ARTWORK IMAGES & DEPTH MAPS ===")
    img_files = glob.glob(os.path.join(IMAGES_DIR, '*.jpg')) + \
                glob.glob(os.path.join(IMAGES_DIR, '*.jpeg')) + \
                glob.glob(os.path.join(IMAGES_DIR, '*.png'))
    
    # Filter out pattern/tile assets
    art_imgs = [p for p in img_files if not any(x in os.path.basename(p) for x in ['thorns', 'tile', 'frame', 'vortex', 'depth'])]
    
    print(f"Total artwork images to process: {len(art_imgs)}")
    for p in art_imgs:
        optimize_image(p)

    print("=== FINISHED OPTIMIZING ASSETS ===")

if __name__ == '__main__':
    main()
