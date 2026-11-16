# -*- coding: utf-8 -*-
"""
export_icons.py — Rhino 9 内运行, 全量导出 GH2 原厂 .ghicon
IronPython 2 兼容 (Rhino 9 内置)

发现的坑:
1. clr.AddReference 必须传短名 "Grasshopper2", 路径在 IronPython 里会炸
2. 反射 Invoke 必须用 System.Array[object]([args]), 不能传 list
3. FromStream 返回 VectorIcon (继承 AbstractIcon), DrawToBitmap 在实例上
4. Eto.Drawing.Bitmap.Save(path) 在 IronPython 里静默失败!
   必须走 MemoryStream 桥接: eto.Save(ms) -> SD.Bitmap(ms) -> sd.Save(path)
"""

import os, sys, json, clr, System, Grasshopper2, Eto.Drawing
clr.AddReference("System.Drawing")
import System.Drawing
import System.Drawing.Imaging
import System.IO

# ─── 路径 ────────────────────────────────────────────────────────────────
ROOT = r"E:\works\Aidev\Kbitai绝对安全\kbitai_com_cn\resources\AC_Tutorial\gh_guide"
ICONS_ROOT = os.path.join(ROOT, "assets", "icons")
DATA_ROOT = os.path.join(ROOT, "data")
SIZES = [24, 48, 96]

# ─── 拿程序集 ────────────────────────────────────────────────────────────
asm = None
for name in dir(Grasshopper2):
    try:
        obj = getattr(Grasshopper2, name)
        if isinstance(obj, type):
            asm = System.Reflection.Assembly.GetAssembly(obj)
            break
    except Exception:
        continue
print("[asm] " + asm.FullName)

# ─── 缓存类型 ────────────────────────────────────────────────────────────
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

# ─── 图标列表 ────────────────────────────────────────────────────────────
all_resources = sorted([n for n in asm.GetManifestResourceNames() if n.endswith('.ghicon')])
print("[resources] {0} 个 .ghicon".format(len(all_resources)))


def render_and_save(res_name, out_dir, size):
    """渲染单个图标并保存为 PNG. 返回 True/False"""
    short = os.path.basename(res_name).replace('.ghicon', '')
    out_path = os.path.join(out_dir, short + ".png")

    try:
        stream = asm.GetManifestResourceStream(res_name)
        icon_obj = from_stream.Invoke(None, System.Array[object]([stream]))

        # DrawToBitmap
        eto_size = Eto.Drawing.Size(size, size)
        eto_bmp = icon_obj.DrawToBitmap(eto_size, 96, Eto.Drawing.Colors.Transparent)

        # MemoryStream 桥接: Eto -> System.Drawing
        ms = System.IO.MemoryStream()
        eto_bmp.Save(ms, Eto.Drawing.ImageFormat.Png)
        ms.Position = 0
        sd_bmp = System.Drawing.Bitmap(ms)
        sd_bmp.Save(out_path, System.Drawing.Imaging.ImageFormat.Png)
        sd_bmp.Dispose()
        ms.Dispose()
        return True
    except Exception as e:
        print("  FAIL {0}: {1}".format(short, str(e)[:60]))
        return False


# ─── 主循环 ──────────────────────────────────────────────────────────────
print("")
print("=" * 60)
print("开始全量导出: {0} 图标 x {1} 尺寸".format(len(all_resources), len(SIZES)))
print("=" * 60)

icon_map = {}
ok_total = 0
fail_total = 0
count = 0

for res_name in all_resources:
    short = os.path.basename(res_name).replace('.ghicon', '')
    icon_map[short] = {"resource": res_name, "sizes": {}}
    count += 1

    if count % 100 == 0:
        print("[progress] {0}/{1}  ok={2} fail={3}".format(
            count, len(all_resources), ok_total, fail_total))

    for sz in SIZES:
        out_dir = os.path.join(ICONS_ROOT, str(sz))
        if not os.path.exists(out_dir):
            os.makedirs(out_dir)
        out_path = os.path.join(out_dir, short + ".png")

        # 跳过已存在
        if os.path.exists(out_path) and os.path.getsize(out_path) > 100:
            icon_map[short]["sizes"][sz] = out_path
            ok_total += 1
            continue

        if render_and_save(res_name, out_dir, sz):
            icon_map[short]["sizes"][sz] = out_path
            ok_total += 1
        else:
            fail_total += 1

print("")
print("=" * 60)
print("完成: ok={0}  fail={1}  总计={2}".format(ok_total, fail_total, ok_total + fail_total))
print("=" * 60)

# ─── 写 icon_map.json ────────────────────────────────────────────────────
map_path = os.path.join(DATA_ROOT, "icon_map.json")
if not os.path.exists(DATA_ROOT):
    os.makedirs(DATA_ROOT)
f = open(map_path, 'w')
try:
    json.dump(icon_map, f, indent=2)
finally:
    f.close()
print("[write] " + map_path)
