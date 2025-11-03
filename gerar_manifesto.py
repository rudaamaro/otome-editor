import os
import json

# Caminho da pasta principal
assets_dir = "assets"
manifest = {}

# Percorre cada tipo de personagem (female, male, female-mature, male-mature)
for character in os.listdir(assets_dir):
    character_path = os.path.join(assets_dir, character)
    if not os.path.isdir(character_path):
        continue

    manifest[character] = {}

    # Percorre as categorias internas (base, eyes, hair_front etc.)
    for category in os.listdir(character_path):
        category_path = os.path.join(character_path, category)
        if not os.path.isdir(category_path):
            continue

        # Lista apenas arquivos de imagem
        files = [
            f for f in os.listdir(category_path)
            if f.lower().endswith((".png", ".jpg", ".jpeg", ".webp"))
        ]

        manifest[character][category] = sorted(files)

# Cria o manifesto JSON
with open("assets_manifest.json", "w", encoding="utf-8") as f:
    json.dump(manifest, f, indent=2, ensure_ascii=False)

print("✅ Manifesto criado com sucesso: assets_manifest.json")
