import base64
import os
import subprocess
from PIL import Image

def get_base64_data_uri(file_path: str, mime: str) -> str:
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Missing file: {file_path}")
    with open(file_path, "rb") as f:
        encoded = base64.b64encode(f.read()).decode("utf-8")
    return f"data:{mime};base64,{encoded}"

def read_text_file(file_path: str) -> str:
    with open(file_path, "r", encoding="utf-8") as f:
        return f.read().strip()

def build_banner():
    # 1. Fonts as base64
    font_reg_b64 = get_base64_data_uri("public/assets/fonts/GT-Alpina-Typewriter-Regular-Trial.otf", "font/opentype")
    font_med_b64 = get_base64_data_uri("public/assets/fonts/GT-Alpina-Typewriter-Medium-Trial.otf", "font/opentype")
    font_bold_b64 = get_base64_data_uri("public/assets/fonts/GT-Alpina-Typewriter-Bold-Trial.otf", "font/opentype")

    # 2. Official Zolius Logo PNG as base64
    zolius_logo_b64 = get_base64_data_uri("public/zolius-logo.png", "image/png")

    # 3. Background 3D glass quantum ring as base64
    bg_ring_b64 = get_base64_data_uri("public/assets/banners/zolius_quantum_ring_raw.jpg", "image/jpeg")

    # 4. Partner logos as base64
    certora_b64 = get_base64_data_uri("public/assets/logo/certora-white.png", "image/png")
    ottersec_b64 = get_base64_data_uri("public/assets/logo/ottersec-white.png", "image/png")
    
    # 5. SVGs
    solana_svg = read_text_file("public/assets/logo/solana-white.svg")
    zksecurity_svg = read_text_file("public/assets/logo/zksecurity-white.svg")

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Zolius Vault — Official Preview Banner</title>
  <style>
    @font-face {{
      font-family: "GT Alpina Typewriter";
      src: url("{font_reg_b64}") format("opentype");
      font-weight: 400;
      font-style: normal;
    }}
    @font-face {{
      font-family: "GT Alpina Typewriter";
      src: url("{font_med_b64}") format("opentype");
      font-weight: 500;
      font-style: normal;
    }}
    @font-face {{
      font-family: "GT Alpina Typewriter";
      src: url("{font_bold_b64}") format("opentype");
      font-weight: 700;
      font-style: normal;
    }}

    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }}

    html, body {{
      width: 1200px;
      height: 630px;
      overflow: hidden;
      background-color: #060606;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }}

    .banner-canvas {{
      width: 1200px;
      height: 630px;
      position: relative;
      overflow: hidden;
      background-color: #060606;
      background-image: 
        radial-gradient(circle at 82% 48%, rgba(255, 140, 0, 0.18) 0%, rgba(236, 72, 153, 0.08) 25%, transparent 55%),
        linear-gradient(90deg, #060606 0%, rgba(6, 6, 6, 0.98) 44%, rgba(6, 6, 6, 0.72) 66%, rgba(6, 6, 6, 0.12) 100%),
        url('{bg_ring_b64}');
      background-size: auto, auto, cover;
      background-position: center, center, right center;
      background-repeat: no-repeat;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 52px 64px 44px 64px;
    }}

    /* Ambient Subtle Grid Overlay */
    .banner-grid {{
      position: absolute;
      inset: 0;
      background-image: 
        linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
      background-size: 36px 36px;
      pointer-events: none;
      z-index: 1;
    }}

    /* Cryptographic Ring Accent Line */
    .quantum-accent {{
      position: absolute;
      right: 170px;
      top: 50%;
      transform: translateY(-50%);
      width: 340px;
      height: 340px;
      border-radius: 50%;
      border: 1px dashed rgba(255, 140, 0, 0.28);
      pointer-events: none;
      z-index: 2;
    }}

    /* Corner Editorial Marks */
    .crop-mark {{
      position: absolute;
      width: 16px;
      height: 16px;
      border-color: rgba(255, 140, 0, 0.5);
      pointer-events: none;
      z-index: 3;
    }}
    .crop-tl {{ top: 20px; left: 20px; border-top: 1.5px solid; border-left: 1.5px solid; }}
    .crop-tr {{ top: 20px; right: 20px; border-top: 1.5px solid; border-right: 1.5px solid; }}
    .crop-bl {{ bottom: 20px; left: 20px; border-bottom: 1.5px solid; border-left: 1.5px solid; }}
    .crop-br {{ bottom: 20px; right: 20px; border-bottom: 1.5px solid; border-right: 1.5px solid; }}

    /* Content Layer */
    .banner-content {{
      position: relative;
      z-index: 5;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 100%;
    }}

    /* Top Row */
    .top-bar {{
      display: flex;
      justify-content: space-between;
      align-items: center;
    }}

    .brand-group {{
      display: flex;
      align-items: center;
      gap: 16px;
    }}

    .brand-icon {{
      width: 50px;
      height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.16);
      box-shadow: 0 0 24px rgba(236, 72, 153, 0.5), 0 0 45px rgba(168, 85, 247, 0.35);
      overflow: hidden;
      flex-shrink: 0;
    }}

    .brand-icon img {{
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }}

    .brand-name {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", monospace;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      gap: 10px;
    }}

    .brand-badge {{
      font-size: 11px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      background: linear-gradient(135deg, rgba(236, 72, 153, 0.2), rgba(255, 140, 0, 0.2));
      border: 1px solid rgba(255, 140, 0, 0.55);
      color: #FF8C00;
      padding: 3px 9px;
      border-radius: 5px;
    }}

    .network-pill {{
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(14, 14, 14, 0.9);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.16);
      padding: 9px 20px;
      border-radius: 9999px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12.5px;
      letter-spacing: 0.08em;
      color: #EDEDED;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.6);
    }}

    .network-pill .solana-icon {{
      height: 14px;
      width: 18px;
      display: flex;
      align-items: center;
    }}

    .network-pill .solana-icon svg {{
      width: 100%;
      height: 100%;
    }}

    .live-dot {{
      width: 7.5px;
      height: 7.5px;
      border-radius: 50%;
      background-color: #10B981;
      box-shadow: 0 0 12px #10B981;
    }}

    /* Center Section */
    .hero-section {{
      max-width: 690px;
      margin-top: 6px;
      margin-bottom: 6px;
    }}

    .kicker {{
      display: inline-flex;
      align-items: center;
      gap: 12px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #FF8C00;
      margin-bottom: 16px;
    }}

    .kicker-line {{
      width: 26px;
      height: 1.5px;
      background: linear-gradient(90deg, #FF8C00, #EC4899);
    }}

    .headline {{
      font-family: "GT Alpina Typewriter", Georgia, "Times New Roman", serif;
      font-size: 51px;
      line-height: 1.05;
      font-weight: 400;
      color: #F8F8F6;
      letter-spacing: -0.025em;
      margin-bottom: 18px;
      text-shadow: 0 4px 28px rgba(0, 0, 0, 0.8);
    }}

    .headline em {{
      font-style: italic;
      color: #FFFFFF;
      font-weight: 500;
      background: linear-gradient(135deg, #FFFFFF 30%, #F472B6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }}

    .subtext {{
      font-size: 16.5px;
      line-height: 1.55;
      color: #A3A3A3;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      max-width: 630px;
      margin-bottom: 24px;
    }}

    /* Feature Pillars */
    .feature-pillars {{
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }}

    .pillar-tag {{
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(18, 18, 18, 0.88);
      backdrop-filter: blur(14px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      padding: 7px 15px;
      border-radius: 6px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12.5px;
      color: #EDEDED;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
    }}

    .pillar-tag .code {{
      color: #FF8C00;
      font-weight: 600;
    }}

    /* Bottom Anchor Row */
    .bottom-bar {{
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-top: 18px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }}

    .trust-block {{
      display: flex;
      flex-direction: column;
      gap: 9px;
    }}

    .trust-label {{
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 10px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #787878;
    }}

    .trust-logos {{
      display: flex;
      align-items: center;
      gap: 26px;
    }}

    .trust-logos img {{
      height: 18px;
      width: auto;
      opacity: 0.92;
      filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.5));
    }}

    .trust-logos .svg-logo {{
      height: 18px;
      display: flex;
      align-items: center;
      opacity: 0.92;
    }}

    .trust-logos .svg-logo svg {{
      height: 100%;
      width: auto;
    }}

    .url-chip {{
      display: flex;
      align-items: center;
      gap: 10px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 14px;
      letter-spacing: 0.04em;
      color: #FFFFFF;
      background: rgba(18, 18, 18, 0.9);
      border: 1px solid rgba(255, 140, 0, 0.45);
      padding: 9px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(255, 140, 0, 0.15);
    }}

    .x-icon {{
      width: 14px;
      height: 14px;
      fill: #FF8C00;
    }}
  </style>
</head>
<body>

  <div class="banner-canvas">
    <div class="banner-grid"></div>
    <div class="quantum-accent"></div>
    <div class="crop-mark crop-tl"></div>
    <div class="crop-mark crop-tr"></div>
    <div class="crop-mark crop-bl"></div>
    <div class="crop-mark crop-br"></div>

    <div class="banner-content">
      <!-- Top Row -->
      <div class="top-bar">
        <div class="brand-group">
          <div class="brand-icon">
            <img src="{zolius_logo_b64}" alt="Zolius Vault Emblem">
          </div>
          <div class="brand-name">
            Zolius
            <span class="brand-badge">Vault</span>
          </div>
        </div>

        <div class="network-pill">
          <div class="solana-icon">
            {solana_svg}
          </div>
          <span>SOLANA DEVNET</span>
          <span class="live-dot"></span>
          <span>PRIVACY RINGS</span>
        </div>
      </div>

      <!-- Center Hero Section -->
      <div class="hero-section">
        <div class="kicker">
          <span class="kicker-line"></span>
          <span>Confidential Solana Protocol</span>
        </div>
        <h1 class="headline">
          Self-Custodial <em>Confidential</em><br>Transfers on Solana.
        </h1>
        <p class="subtext">
          Zero-Knowledge Groth16 proofs break on-chain transaction graph links. Cryptographically shielded by post-quantum ML-KEM-768 lattice vaults with client-side verification.
        </p>
        <div class="feature-pillars">
          <div class="pillar-tag">
            <span class="code">[ZK-SNARK]</span> Groth16 Proofs
          </div>
          <div class="pillar-tag">
            <span class="code">[LATTICE]</span> ML-KEM-768 Vault
          </div>
          <div class="pillar-tag">
            <span class="code">[SPL]</span> Token-2022 Ready
          </div>
        </div>
      </div>

      <!-- Bottom Bar -->
      <div class="bottom-bar">
        <div class="trust-block">
          <div class="trust-label">Security Audits &amp; Formal Verification</div>
          <div class="trust-logos">
            <img src="{certora_b64}" alt="Certora" style="height: 17px;">
            <img src="{ottersec_b64}" alt="OtterSec" style="height: 19px;">
            <div class="svg-logo">
              {zksecurity_svg}
            </div>
          </div>
        </div>

        <div class="url-chip">
          <svg class="x-icon" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          <span style="font-weight: 700; color: #FFFFFF;">@ZoliusVault</span>
          <span style="color: rgba(255, 255, 255, 0.4); margin: 0 4px;">·</span>
          <span style="color: #FF8C00; font-weight: 600;">zoliusvault.tech</span>
        </div>
      </div>
    </div>
  </div>

</body>
</html>
"""

    temp_html = os.path.abspath("scripts/temp_zolius_banner.html")
    with open(temp_html, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"Wrote self-contained banner HTML: {temp_html} ({len(html)} bytes)")

    out_png = os.path.abspath("public/og-banner.png")
    user_data_dir = os.path.abspath("scripts/.chrome_user_data")
    
    # Chrome headless command
    chrome_cmd = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        f"--user-data-dir={user_data_dir}",
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        f"--screenshot={out_png}",
        "--window-size=1200,630",
        f"file:///{temp_html}"
    ]

    print("Executing Chrome headless render...")
    res = subprocess.run(chrome_cmd, capture_output=True, text=True)
    if res.stdout:
        print("Chrome stdout:", res.stdout)
    if res.stderr:
        print("Chrome stderr:", res.stderr)

    if not os.path.exists(out_png):
        raise RuntimeError("Chrome failed to create public/og-banner.png")

    img = Image.open(out_png)
    print(f"Captured banner dimensions: {img.size}")
    if img.size != (1200, 630):
        print(f"Cropping banner from {img.size} to (1200, 630)...")
        img = img.crop((0, 0, 1200, 630))
        img.save(out_png)

    # Save to all target paths
    out_banner_link = "public/assets/banners/zolius-link-banner.png"
    img.save(out_banner_link)
    print(f"Saved: {out_banner_link}")

    out_jpg = "public/og-banner.jpg"
    img_rgb = img.convert("RGB")
    img_rgb.save(out_jpg, quality=95)
    print(f"Saved: {out_jpg}")

    # Clean up temp files
    if os.path.exists(temp_html):
        os.remove(temp_html)
    print("Banner render completed successfully!")

if __name__ == "__main__":
    build_banner()
