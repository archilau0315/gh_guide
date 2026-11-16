# -*- coding: utf-8 -*-
"""
diag5.py — 极简验证, 1 个图标, 每步 print, 兼容 IronPython 2
"""
import os, clr, System, Grasshopper2, Eto.Drawing

ROOT = r"E:\works\Aidev\Kbitai绝对安全\kbitai_com_cn\resources\AC_Tutorial\gh_guide"
OUT_DIR = os.path.join(ROOT, "assets", "icons", "48")
OUT_PATH = os.path.join(OUT_DIR, "test1.png")

print("[1] ensure dir: " + OUT_DIR)
if not os.path.exists(OUT_DIR):
    os.makedirs(OUT_DIR)

print("[2] get asm")
asm = None
for name in dir(Grasshopper2):
    try:
        obj = getattr(Grasshopper2, name)
        if isinstance(obj, type):
            asm = System.Reflection.Assembly.GetAssembly(obj)
            break
    except Exception:
        continue

print("[3] find 1st ghicon")
res_name = None
for n in asm.GetManifestResourceNames():
    if n.endswith('.ghicon'):
        res_name = n
        break
print("  resource: " + res_name)

print("[4] get stream")
stream = asm.GetManifestResourceStream(res_name)

print("[5] find AbstractIcon.FromStream")
abstract_icon = None
for t in asm.GetTypes():
    if t.Name == 'AbstractIcon':
        abstract_icon = t
        break
from_stream = None
for m in abstract_icon.GetMethods(System.Reflection.BindingFlags.Static | System.Reflection.BindingFlags.Public):
    if m.Name == 'FromStream':
        from_stream = m
        break

print("[6] invoke FromStream")
icon_obj = from_stream.Invoke(None, System.Array[object]([stream]))
print("  icon type: " + icon_obj.GetType().FullName)

print("[7] DrawToBitmap 48x48")
size = Eto.Drawing.Size(48, 48)
bmp = icon_obj.DrawToBitmap(size, 96, Eto.Drawing.Colors.Transparent)
print("  bmp type: " + bmp.GetType().FullName)

print("[8] Save -> " + OUT_PATH)
bmp.Save(OUT_PATH)
print("  Save returned")

print("[9] check exists")
if os.path.exists(OUT_PATH):
    sz = os.path.getsize(OUT_PATH)
    print("  YES! size=" + str(sz) + " bytes")
else:
    print("  NO. file not found")

print("[DONE]")
