# -*- coding: utf-8 -*-
"""
diag_batch.py — 批量测试前 10 个图标, 每个都打完整错误堆栈
"""
import os, sys, json, clr, System, Grasshopper2, Eto.Drawing
clr.AddReference("System.Drawing")
import System.Drawing
import System.Drawing.Imaging
import System.IO
import traceback

ROOT = r"E:\works\Aidev\Kbitai绝对安全\kbitai_com_cn\resources\AC_Tutorial\gh_guide"
ICONS_ROOT = os.path.join(ROOT, "assets", "icons")

asm = None
for name in dir(Grasshopper2):
    try:
        obj = getattr(Grasshopper2, name)
        if isinstance(obj, type):
            asm = System.Reflection.Assembly.GetAssembly(obj)
            break
    except Exception:
        continue

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

all_resources = sorted([n for n in asm.GetManifestResourceNames() if n.endswith('.ghicon')])
print("[resources] {0} 个 .ghicon, 测试前 10 个\n".format(len(all_resources)))

ok = 0
fail = 0

for idx, res_name in enumerate(all_resources[:10]):
    short = os.path.basename(res_name).replace('.ghicon', '')
    print("[{0}] {1}".format(idx + 1, short))

    for sz in [24, 48, 96]:
        out_dir = os.path.join(ICONS_ROOT, str(sz))
        if not os.path.exists(out_dir):
            os.makedirs(out_dir)
        out_path = os.path.join(out_dir, short + ".png")

        try:
            stream = asm.GetManifestResourceStream(res_name)
            icon_obj = from_stream.Invoke(None, System.Array[object]([stream]))

            eto_size = Eto.Drawing.Size(sz, sz)
            eto_bmp = icon_obj.DrawToBitmap(eto_size, 96, Eto.Drawing.Colors.Transparent)

            # MemoryStream 桥接
            ms = System.IO.MemoryStream()
            eto_bmp.Save(ms)
            ms.Position = 0
            sd_bmp = System.Drawing.Bitmap(ms)
            sd_bmp.Save(out_path, System.Drawing.Imaging.ImageFormat.Png)
            sd_bmp.Dispose()
            ms.Dispose()

            if os.path.exists(out_path) and os.path.getsize(out_path) > 100:
                print("  {0}x{0} OK ({1} bytes)".format(sz, os.path.getsize(out_path)))
                ok += 1
            else:
                print("  {0}x{0} FAIL (文件不存在或太小)".format(sz))
                fail += 1
        except Exception as e:
            print("  {0}x{0} FAIL".format(sz))
            print("    err: " + str(e)[:120])
            traceback.print_exc()
            fail += 1

print("\nok={0} fail={1}".format(ok, fail))
