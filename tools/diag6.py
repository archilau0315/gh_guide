# -*- coding: utf-8 -*-
"""
diag6.py — 1 个图标, Eto Bitmap 转 System.Drawing.Bitmap 再保存
IronPython 2 兼容
"""
import os, clr, System, Grasshopper2, Eto.Drawing

# 必须加 System.Drawing 引用
clr.AddReference("System.Drawing")
import System.Drawing
import System.Drawing.Imaging

ROOT = r"E:\works\Aidev\Kbitai绝对安全\kbitai_com_cn\resources\AC_Tutorial\gh_guide"
OUT_PATH = os.path.join(ROOT, "assets", "icons", "48", "test1.png")

print("[1] dir ok")
if not os.path.exists(os.path.dirname(OUT_PATH)):
    os.makedirs(os.path.dirname(OUT_PATH))

print("[2] asm")
asm = None
for name in dir(Grasshopper2):
    try:
        obj = getattr(Grasshopper2, name)
        if isinstance(obj, type):
            asm = System.Reflection.Assembly.GetAssembly(obj)
            break
    except Exception:
        continue

print("[3] resource")
res_name = None
for n in asm.GetManifestResourceNames():
    if n.endswith('.ghicon'):
        res_name = n
        break

stream = asm.GetManifestResourceStream(res_name)
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

print("[4] FromStream")
icon_obj = from_stream.Invoke(None, System.Array[object]([stream]))

print("[5] DrawToBitmap Eto")
size = Eto.Drawing.Size(48, 48)
eto_bmp = icon_obj.DrawToBitmap(size, 96, Eto.Drawing.Colors.Transparent)

print("  eto_bmp: " + eto_bmp.GetType().FullName)
print("  eto_bmp.Size: " + str(eto_bmp.Width) + "x" + str(eto_bmp.Height))

# ── 关键: Eto Bitmap 转 System.Drawing.Bitmap ──
# 方式 A: Eto.Drawing.Bitmap 有 ToBitmap() 方法吗?
print("")
print("[6] 转 System.Drawing.Bitmap")
sd_bmp = None

# 查 Eto Bitmap 所有方法
print("  Eto Bitmap 公共方法:")
for m in eto_bmp.GetType().GetMethods(System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.DeclaredOnly):
    if not m.IsSpecialName:
        print("    " + m.Name)

# 方式 A: ToBitmap()
try:
    sd_bmp = eto_bmp.ToBitmap()
    print("  A: ToBitmap() OK -> " + sd_bmp.GetType().FullName)
except Exception as e:
    print("  A: ToBitmap() fail: " + str(e)[:80])

# 方式 B: GetData + 构造 SD Bitmap
if not sd_bmp:
    try:
        print("  B: 用 GetData + SD Bitmap 构造")
        sd_bmp = System.Drawing.Bitmap(eto_bmp.Width, eto_bmp.Height)
        print("    created SD bitmap " + str(eto_bmp.Width) + "x" + str(eto_bmp.Height))
        # 用 Graphics 桥接
        g = System.Drawing.Graphics.FromImage(sd_bmp)
        # Eto 有没有能 Draw 到 SD Graphics 的方法?
        # 先用最简单的: 直接 save Eto 到 MemoryStream 再读
        print("    尝试 MemoryStream 桥接")
        import System.IO
        ms = System.IO.MemoryStream()
        eto_bmp.Save(ms, Eto.Drawing.ImageFormat.Png)
        ms.Position = 0
        sd_bmp = System.Drawing.Bitmap(ms)
        print("    MemoryStream 桥接 OK")
    except Exception as e:
        print("  B: fail: " + str(e)[:80])
        import traceback
        traceback.print_exc()

# 方式 C: 直接 System.Drawing.Bitmap 从 Eto 文件流保存
if not sd_bmp:
    try:
        print("  C: Save Eto 到 MemoryStream -> SD Bitmap")
        import System.IO
        ms = System.IO.MemoryStream()
        eto_bmp.Save(ms)
        ms.Position = 0
        sd_bmp = System.Drawing.Bitmap(ms)
        print("  C OK")
    except Exception as e:
        print("  C fail: " + str(e)[:80])

if sd_bmp:
    print("[7] Save SD Bitmap -> " + OUT_PATH)
    sd_bmp.Save(OUT_PATH, System.Drawing.Imaging.ImageFormat.Png)
    print("  Save 完成")
    if os.path.exists(OUT_PATH):
        print("[OK!] 文件大小: " + str(os.path.getsize(OUT_PATH)) + " bytes")
    else:
        print("[FAIL] 保存后文件仍不存在")
else:
    print("[FATAL] 转 SD Bitmap 失败, 没法保存")

print("[DONE]")
