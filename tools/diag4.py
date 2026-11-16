# -*- coding: utf-8 -*-
"""
diag4.py — 全流程验证: FromStream → DrawToBitmap → 保存
只改保存那一步, 其他跟成功的 diag3 一样
"""

import clr
import System
import Grasshopper2
import Eto.Drawing

asm = None
for name in dir(Grasshopper2):
    try:
        obj = getattr(Grasshopper2, name)
        if isinstance(obj, type):
            asm = System.Reflection.Assembly.GetAssembly(obj)
            break
    except Exception:
        continue

# 导出前 5 个
count = 0
for res_name in sorted([n for n in asm.GetManifestResourceNames() if n.endswith('.ghicon')])[:5]:
    short = res_name.split('.')[-2] if res_name.endswith('.ghicon') else res_name
    out_path = os.path.join(
        r"E:\works\Aidev\Kbitai绝对安全\kbitai_com_cn\resources\AC_Tutorial\gh_guide\assets\icons\48",
        short + ".png"
    )
    import os
    os.makedirs(os.path.dirname(out_path), True)

    print(res_name.split('.')[-2], end=" ")
    try:
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
        icon_obj = from_stream.Invoke(None, System.Array[object]([stream]))

        size = Eto.Drawing.Size(48, 48)
        bmp = icon_obj.DrawToBitmap(size, 96, Eto.Drawing.Colors.Transparent)

        # Eto Bitmap 的 Save 方法 — 直接传文件路径
        bmp.Save(out_path)
        print("OK -> " + out_path)
        count += 1
    except Exception as e:
        print("FAIL: " + str(e)[:80])
        import traceback
        traceback.print_exc()

print("\n导出: " + str(count) + "/5")
