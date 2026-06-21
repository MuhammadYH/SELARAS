"""
Batch 4 transformer: /admin/*.html → /dashboard/admin/*.html
- Fixes all CSS/JS/asset paths
- Updates nav hrefs & data-page attributes
- Injects shared JS stack (supabaseClient → roleGuard) before </body>
- Adds SELARAS_GUARD.protect(['admin']) DOMContentLoaded block
- Removes old admin-auth.js references
"""

import re, os

SRC_DIR  = '/tmp/admin_src/admin'
DEST_DIR = '/home/claude/batch4/dashboard/admin'

# Old filename → new filename mapping
PAGE_MAP = {
    'admin-dashboard.html' : 'index.html',
    'admin-smart-bin.html' : 'smart-bin.html',
    'admin-riwayat.html'   : 'riwayat.html',
    'admin-laporan.html'   : 'laporan.html',
    'admin-notifikasi.html': 'notifikasi.html',
    'admin-pengaturan.html': 'pengaturan.html',
    'admin-bantuan.html'   : 'bantuan.html',
}

# CSS replacements: old href value → new href value
CSS_MAP = {
    'css/admin-shared.css'     : '/dashboard/shared/css/shared.css',
    'css/admin-layout.css'     : '/dashboard/shared/css/layout.css',
    'css/admin-components.css' : '/dashboard/shared/css/components.css',
    'css/admin-navbar.css'     : '/dashboard/shared/css/navbar.css',
    # page-specific stay relative
}

SHARED_JS_STACK = """\
  <!-- Shared core (Batch 2-3) -->
  <script src="/dashboard/shared/js/supabaseClient.js"></script>
  <script src="/dashboard/shared/js/auth.js"></script>
  <script src="/dashboard/shared/js/session.js"></script>
  <script src="/dashboard/shared/js/logout.js"></script>
  <script src="/dashboard/shared/js/api.js"></script>
  <script src="/dashboard/shared/js/redirect.js"></script>
  <script src="/dashboard/shared/js/roleGuard.js"></script>"""

GUARD_BLOCK = """\
  <script>
    document.addEventListener('DOMContentLoaded', async () => {
      const ctx = await SELARAS_GUARD.protect(['admin']);
      if (!ctx) return;
      // Populate user info in sidebar
      const nameEl  = document.querySelector('.user-name');
      const emailEl = document.querySelector('.user-email');
      if (nameEl  && ctx.profile?.full_name) nameEl.textContent  = ctx.profile.full_name;
      if (emailEl && ctx.user?.email)        emailEl.textContent = ctx.user.email;
    });
  </script>"""

def transform(html, old_filename):
    new_filename = PAGE_MAP[old_filename]

    # 1. CSS paths
    for old, new in CSS_MAP.items():
        html = html.replace(f'href="{old}"', f'href="{new}"')

    # 2. Logo asset
    html = html.replace('src="assets/LOGO_SELARAS.png"', 'src="/assets/LOGO_SELARAS.png"')

    # 3. Nav hrefs & data-page
    for old_f, new_f in PAGE_MAP.items():
        html = html.replace(f'href="{old_f}"', f'href="/dashboard/admin/{new_f}"')
        old_dp = old_f  # data-page="admin-dashboard.html"
        new_dp = new_f
        html = html.replace(f'data-page="{old_dp}"', f'data-page="{new_dp}"')

    # 4. Remove old admin-auth.js
    html = re.sub(r'\s*<script src="js/admin-auth\.js"></script>', '', html)

    # 5. Inject shared JS stack before first page-specific <script src="js/
    html = re.sub(
        r'(<script src="js/)',
        SHARED_JS_STACK + '\n  \\1',
        html,
        count=1
    )

    # 6. Inject guard block before </body>
    html = html.replace('</body>', GUARD_BLOCK + '\n</body>')

    return html


os.makedirs(DEST_DIR, exist_ok=True)

for old_f, new_f in PAGE_MAP.items():
    src_path  = os.path.join(SRC_DIR, old_f)
    dest_path = os.path.join(DEST_DIR, new_f)
    if not os.path.exists(src_path):
        print(f'SKIP (not found): {old_f}')
        continue
    with open(src_path, encoding='utf-8') as f:
        html = f.read()
    html = transform(html, old_f)
    with open(dest_path, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f'✅  {old_f} → {new_f}')
