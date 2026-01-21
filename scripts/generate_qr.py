import qrcode
from PIL import Image, ImageDraw, ImageFont
import os

# Konfigurasi Link (Ganti dengan URL website monitoring Anda)
BASE_URL = "https://kppn-checker.vercel.app/monitoring?loc="

def generate_room_qr(room_id, room_name):
    # 1. Buat QR Code
    url = f"{BASE_URL}{room_id}"
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(url)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white").convert('RGB')
    
    # 2. Tambahkan Teks Nama Ruangan di bawahnya
    canvas = Image.new('RGB', (img.size[0], img.size[1] + 50), 'white')
    canvas.paste(img, (0, 0))
    
    draw = ImageDraw.Draw(canvas)
    # Gunakan font default jika tidak ada file font .ttf
    text = f"{room_id} - {room_name}"
    # Hitung posisi tengah
    w, h = draw.textsize(text) if hasattr(draw, 'textsize') else (100, 10)
    draw.text(((img.size[0] - w) / 2, img.size[1] - 10), text, fill="black")
    
    # 3. Simpan
    if not os.path.exists('qrcodes'): os.makedirs('qrcodes')
    filename = f"qrcodes/QR_{room_id}.png"
    canvas.save(filename)
    print(f"Berhasil membuat: {filename}")

# Contoh pemakaian manual (Anda bisa looping dari data Supabase)
# generate_room_qr("A1", "RUANG KEPALA")