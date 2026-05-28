import requests
import os
import time

# İndirilecek klasör
output_dir = "public/audio/surah"
os.makedirs(output_dir, exist_ok=True)

# Kari kodu (sds = Sudais)
kari = "sds"
base_url = f"https://server11.mp3quran.net/{kari}"

print("Kuran sureleri indiriliyor...")
print("=" * 40)

for surah_num in range(1, 115):
    filename = f"{surah_num:03d}.mp3"
    url = f"{base_url}/{filename}"
    output_path = os.path.join(output_dir, filename)
    
    # Zaten indirilmişse atla
    if os.path.exists(output_path) and os.path.getsize(output_path) > 100_000:
        print(f"[{surah_num}/114] ✅ {filename} zaten var, atlandı")
        continue
    
    try:
        print(f"[{surah_num}/114] ⏳ {filename} indiriliyor...", end=" ")
        response = requests.get(url, timeout=60)
        
        if response.status_code == 200 and len(response.content) > 100_000:
            with open(output_path, 'wb') as f:
                f.write(response.content)
            size_mb = len(response.content) / (1024 * 1024)
            print(f"✅ Tamam ({size_mb:.1f} MB)")
        else:
            print(f"❌ Hata: Dosya çok küçük veya bulunamadı")
    except Exception as e:
        print(f"❌ Hata: {e}")
    
    # Sunucuyu yormamak için kısa bekleme
    time.sleep(0.5)

print("=" * 40)
print("İndirme tamamlandı!")