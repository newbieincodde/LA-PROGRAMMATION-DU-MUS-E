import os
import urllib.request
import urllib.parse
import json
from PIL import Image, ImageFilter, ImageOps

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMAGES_DIR = os.path.join(BASE_DIR, 'assets', 'images')
DEPTHS_DIR = os.path.join(BASE_DIR, 'assets', 'depths')

# Specific queries for each artwork to fetch its exact unique visual
TARGETS = [
    ("ishtar-processional-lion", "Ishtar Gate relief lion Pergamon"),
    ("egyptian-sphinx-hatshepsut", "Sphinx of Hatshepsut MET"),
    ("roman-portrait-augustus", "Bust of Augustus Glyptothek"),
    ("parthenon-mourning-athena", "Mourning Athena Acropolis Museum"),
    ("attic-black-figure-amphora", "Exekias Achilles Ajax dice"),
    ("mesopotamian-standing-worshiper", "Tell Asmar Worshipper Oriental Institute"),
    ("roman-mosaic-cave-canem", "Cave canem mosaic Pompeii"),
    ("lady-unicorn-touch", "La Dame à la licorne Toucher Cluny"),
    ("lady-unicorn-sight", "La Dame à la licorne Vue Cluny"),
    ("lady-unicorn-smell", "La Dame à la licorne Odorat Cluny"),
    ("lady-unicorn-taste", "La Dame à la licorne Goût Cluny"),
    ("lady-unicorn-hearing", "La Dame à la licorne Ouïe Cluny"),
    ("unicorn-at-the-fountain", "The Unicorn at the Fountain Cloisters"),
    ("devonshire-hunting-tapestry", "Devonshire Hunting Tapestries V&A"),
    ("rembrandt-self-portrait-1660", "Rembrandt Self-Portrait 1659 National Gallery"),
    ("georges-de-la-tour-magdalene", "Georges de La Tour Penitent Magdalene"),
    ("cezanne-card-players", "Cézanne The Card Players Barnes or Met"),
    ("hokusai-thunderstorm-fuji", "Rainstorm Beneath the Summit Hokusai"),
    ("hokusai-kirifuri-waterfall", "Kirifuri waterfall Hokusai"),
    ("hiroshige-sudden-shower", "Sudden Shower over Shin-Ōhashi bridge Hiroshige"),
    ("hiroshige-kameido-plum-park", "Plum Estate Kameido Hiroshige"),
    ("utamaro-three-beauties", "Three Beauties of the Present Day Utamaro"),
    ("tohaku-pine-trees-screen", "Hasegawa Tohaku Pine Trees screen"),
    ("kano-sanraku-dragon", "Dragon Kano Sanraku Myoshinji"),
    ("hokusai-ejiri-suruga", "Ejiri in Suruga Province Hokusai"),
]

def search_and_download(art_id, query):
    params = urllib.parse.urlencode({
        'action': 'query',
        'generator': 'search',
        'gsrsearch': query,
        'gsrnamespace': 6,
        'gsrlimit': 1,
        'prop': 'imageinfo',
        'iiprop': 'url',
        'format': 'json'
    })
    api_url = f'https://commons.wikimedia.org/w/api.php?{params}'
    headers = {'User-Agent': 'EthereMuseum/2.0 (contact@ethere-atelier.art)'}
    
    try:
        req = urllib.request.Request(api_url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as r:
            d = json.loads(r.read())
            pages = d.get('query', {}).get('pages', {})
            for pid, page in pages.items():
                imginfo = page.get('imageinfo', [])
                if imginfo:
                    img_url = imginfo[0]['url']
                    print(f"Downloading {art_id} from {img_url[:70]}...")
                    # Download image bytes
                    img_req = urllib.request.Request(img_url, headers=headers)
                    with urllib.request.urlopen(img_req, timeout=15) as img_r:
                        img_bytes = img_r.read()
                        if len(img_bytes) > 20000:
                            dest_img = os.path.join(IMAGES_DIR, f"{art_id}.jpg")
                            with open(dest_img, 'wb') as f:
                                f.write(img_bytes)
                            print(f"  -> Saved {dest_img} ({len(img_bytes)} bytes)")

                            # Generate distinct depth map
                            dest_depth = os.path.join(DEPTHS_DIR, f"{art_id}.png")
                            im = Image.open(dest_img).convert('L')
                            blurred = im.filter(ImageFilter.GaussianBlur(radius=2.5))
                            depth = ImageOps.autocontrast(blurred, cutoff=2)
                            depth.save(dest_depth, 'PNG', optimize=True)
                            print(f"  -> Generated unique depth map: {dest_depth}")
                            return True
    except Exception as e:
        print(f"  Error fetching {art_id}: {e}")
    return False

def main():
    print("=== REFINING DISTINCT IMAGES FOR ALL 33 ARTWORKS ===")
    for art_id, query in TARGETS:
        search_and_download(art_id, query)
    print("=== FINISHED REFINING DISTINCT IMAGES ===")

if __name__ == '__main__':
    main()
