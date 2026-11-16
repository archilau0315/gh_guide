# -*- coding: utf-8 -*-
"""
diagnose2.py — 只探两个关键问题:
  1. GH2 组件注册表怎么拿完整组件列表
  2. AbstractIcon.FromStream 在 IronPython 2 里怎么正确调
"""

import clr
import System
import Grasshopper2
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

# ─── 1. GH2 组件注册表在哪里 ────────────────────────────────────────────
print("=" * 60)
print("[1] 搜索组件注册表")
print("=" * 60)

# 常见入口名字
hits = []
for t in asm.GetTypes():
    n = t.Name
    f = t.FullName
    if ('Server' in n or 'Registry' in n or 'Instances' in n or
        'Library' in n or 'Pallette' in n or 'Palette' in n or
        'Group' in n or 'Manager' in n):
        hits.append((n, f, t.IsPublic, t.IsAbstract))

print("潜在注册表类型 ({0} 个):".format(len(hits)))
for n, f, pub, ab in hits:
    print("  {0} public={1} abstract={2}".format(f, pub, ab))

# 找静态 Instance / Current / Active 属性
print("")
print("--- 搜索 'Component' 相关静态属性 ---")
for t in asm.GetTypes():
    if not t.IsPublic:
        continue
    for p in t.GetProperties(System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Static):
        if ('Component' in p.Name or 'Server' in p.Name or 'Registry' in p.Name or
            'Instances' in p.Name or 'Library' in p.Name):
            print("  {0}.{1} : {2}".format(t.FullName, p.Name, p.PropertyType.Name))

# 尝试几个猜测的入口
print("")
print("--- 尝试已知入口 ---")
guess_names = [
    'Grasshopper2.ComponentServer',
    'Grasshopper2.GH2Instances',
    'Grasshopper2.Instances',
    'Grasshopper2.Core.Instances',
    'Grasshopper2.Doc.Instances',
]
for gn in guess_names:
    try:
        parts = gn.split('.')
        obj = Grasshopper2
        for p in parts[1:]:
            obj = getattr(obj, p)
        print("  {0} = {1}".format(gn, str(obj)[:100]))
        # 试试 ComponentCount 属性
        for attr in ['ComponentCount', 'Count', 'Components']:
            try:
                val = getattr(obj, attr)
                print("    .{0} = {1}".format(attr, val))
            except Exception:
                pass
    except Exception as e:
        print("  {0} -> 不存在".format(gn))

# ─── 2. FromStream 在 IronPython 2 里到底怎么调 ────────────────────────
print("")
print("=" * 60)
print("[2] 诊断 FromStream 调用")
print("=" * 60)

# 先拿一个 stream
all_res = []
for n in asm.GetManifestResourceNames():
    if n.endswith('.ghicon'):
        all_res.append(n)
print("总 .ghicon: {0} 个".format(len(all_res)))

res_name = all_res[0]
print("测试资源: " + res_name)
stream = asm.GetManifestResourceStream(res_name)

abstract_icon = None
for t in asm.GetTypes():
    if t.Name == 'AbstractIcon':
        abstract_icon = t
        break

if abstract_icon:
    from_stream = None
    for m in abstract_icon.GetMethods(System.Reflection.BindingFlags.Static | System.Reflection.BindingFlags.Public):
        if m.Name == 'FromStream':
            from_stream = m
            break

    print("FromStream 参数: " + str([p.ParameterType.FullName for p in from_stream.GetParameters()]))

    # 方式 A: System.Array[object]
    print("")
    print("方式 A: System.Array[object]")
    try:
        arg_arr = System.Array[object]([stream])
        result = from_stream.Invoke(None, arg_arr)
        print("  OK -> " + str(type(result)))
    except Exception as e:
        print("  fail -> " + str(e)[:120])

    # 方式 B: 用 clr.System.Array
    print("")
    print("方式 B: list 直接传 (老方式)")
    try:
        result = from_stream.Invoke(None, [stream])
        print("  OK -> " + str(type(result)))
    except Exception as e:
        print("  fail -> " + str(e)[:120])

    # 方式 C: 反射时强转
    print("")
    print("方式 C: MakeArray + 强转")
    try:
        arr_type = System.Array
        args = System.MakeArray[object](1)
        args[0] = stream
        result = from_stream.Invoke(None, args)
        print("  OK -> " + str(type(result)))
    except Exception as e:
        print("  fail -> " + str(e)[:120])

    # 方式 D: IronPython 的 [] 转 tuple 再传
    print("")
    print("方式 D: tuple 包装")
    try:
        args = (stream,)
        result = from_stream.Invoke(None, args)
        print("  OK -> " + str(type(result)))
    except Exception as e:
        print("  fail -> " + str(e)[:120])

    # 方式 E: System.Activator.CreateInstance 调
    print("")
    print("方式 E: IronPython 直接调静态方法")
    try:
        icon_obj = abstract_icon.FromStream(stream)
        print("  OK -> " + str(type(icon_obj)))
    except Exception as e:
        print("  fail -> " + str(e)[:120])

    # 方式 F: 试试 LazyResourceIcon (GH2 可能不用 AbstractIcon.FromStream)
    print("")
    lazy_icon = None
    for t in asm.GetTypes():
        if t.Name == 'LazyResourceIcon':
            lazy_icon = t
            break
    if lazy_icon:
        print("LazyResourceIcon 基类: " + str(lazy_icon.BaseType))
        for c in lazy_icon.GetConstructors():
            params = [p.ParameterType.Name for p in c.GetParameters()]
            print("  ctor params: " + str(params))

    # 方式 G: IconAtlas.GetOrCreate — GH2 正式方式
    print("")
    print("方式 G: IconAtlas.GetOrCreate")
    icon_atlas = None
    for t in asm.GetTypes():
        if t.Name == 'IconAtlas':
            icon_atlas = t
            break
    if icon_atlas:
        print("IconAtlas 静态方法:")
        for m in icon_atlas.GetMethods(System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Static):
            print("  " + m.Name + " -> " + str([p.ParameterType.Name for p in m.GetParameters()]))
        print("")
        print("IconAtlas 实例方法:")
        for m in icon_atlas.GetMethods(System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance):
            if not m.IsSpecialName:
                print("  " + m.Name + " -> " + str([p.ParameterType.Name for p in m.GetParameters()]))

print("")
print("=" * 60)
print("诊断完成")
print("=" * 60)
