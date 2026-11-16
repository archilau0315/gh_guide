# -*- coding: utf-8 -*-
"""
diag3.py — 只测 VectorIcon.DrawToBitmap 到底能不能调
"""

import clr
import System
import Grasshopper2
import Eto.Drawing
import __main__

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

# 拿第一个 .ghicon
res_name = None
for n in asm.GetManifestResourceNames():
    if n.endswith('.ghicon'):
        res_name = n
        break
print("[resource] " + res_name)

stream = asm.GetManifestResourceStream(res_name)

# FromStream — 用方式 A
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

arr = System.Array[object]([stream])
icon_obj = from_stream.Invoke(None, arr)
print("[icon] type=" + icon_obj.GetType().FullName)

# 诊断 VectorIcon 的 DrawToBitmap
obj_type = icon_obj.GetType()
print("")
print("VectorIcon 所有实例方法 (public):")
for m in obj_type.GetMethods(System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.DeclaredOnly):
    if not m.IsSpecialName:
        sig = "{0}({1})".format(m.Name, ", ".join([p.ParameterType.Name + " " + p.Name for p in m.GetParameters()]))
        print("  " + sig)

# 也查 AbstractIcon 继承来的 DrawToBitmap
print("")
print("基类链:")
base = obj_type.BaseType
while base:
    print("  -> " + base.FullName)
    for m in base.GetMethods(System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.DeclaredOnly):
        if 'Draw' in m.Name and not m.IsSpecialName:
            print("    [Draw] " + m.Name + "(" + ", ".join([p.ParameterType.Name for p in m.GetParameters()]) + ")")
    base = base.BaseType

# 试各种 Draw 方法调用
print("")
size = 48
eto_size = Eto.Drawing.Size(size, size)
dpi = 96

# 方式 1: DrawToBitmap (size, dpi, color)
print("方式 1: DrawToBitmap(Size, Int32, Color)")
try:
    color = Eto.Drawing.Colors.Transparent
    m = obj_type.GetMethod('DrawToBitmap')
    print("  method found: " + str(m))
    arr2 = System.Array[object]([eto_size, dpi, color])
    result = m.Invoke(icon_obj, arr2)
    print("  OK! result type=" + result.GetType().FullName)

    # 保存
    import System.Drawing
    out = r"E:\works\Aidev\Kbitai绝对安全\kbitai_com_cn\resources\AC_Tutorial\gh_guide\assets\icons\48\diag3_test.png"
    result.Save(out, System.Drawing.Imaging.ImageFormat.Png)
    print("  saved -> " + out)
except Exception as e:
    print("  fail: " + str(e)[:200])
    import traceback
    traceback.print_exc()

# 方式 2: 试试 DrawBitmap
print("")
print("方式 2: DrawBitmap / Draw / Render")
for meth in ['DrawBitmap', 'Draw', 'Render', 'ToBitmap', 'GetBitmap']:
    try:
        m = obj_type.GetMethod(meth)
        if m:
            print("  " + meth + " 存在, params=" + str([p.ParameterType.Name for p in m.GetParameters()]))
    except Exception:
        pass

# 方式 3: Eto Bitmap 构造 + 直接 Draw 到 Graphics
print("")
print("方式 3: 试试 IIcon 接口方法")
icon_iface = None
for t in asm.GetTypes():
    if t.Name == 'IIcon':
        icon_iface = t
        break
if icon_iface:
    print("IIcon 成员:")
    for m in icon_iface.GetMethods():
        print("  " + m.Name + " -> " + str([p.ParameterType.Name for p in m.GetParameters()]))
    for p in icon_iface.GetProperties():
        print("  prop: " + p.Name + " : " + p.PropertyType.Name)

print("")
print("done")
