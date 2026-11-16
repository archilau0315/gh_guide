# -*- coding: utf-8 -*-
"""
diagnose.py — 诊断脚本，探查 GH2 类型结构和 API 签名
直接在 Rhino 里跑，输出到命令窗口
"""

import clr
import System
import Grasshopper2
import __main__

# 拿程序集
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

# ─── 1. 找所有带 Component / Param / Icon / Resource 的类型 ────────────
print("")
print("=" * 60)
print("[1] 关键类型搜索")
print("=" * 60)

component_types = []
icon_types = []
resource_types = []

for t in asm.GetTypes():
    n = t.Name
    f = t.FullName
    if 'Component' in n and t.IsPublic:
        component_types.append((n, f, t.IsAbstract))
    elif 'Icon' in n or 'Resource' in n:
        if t.IsPublic or 'Icon' in n:
            icon_types.append((n, f))
    elif 'Resource' in n:
        resource_types.append((n, f))

print("--- 含 'Component' 的类型 (前20) ---")
for n, f, a in component_types[:20]:
    abstract = "abstract" if a else ""
    print("  {0}  {1}  {2}".format(n, abstract, f))

print("")
print("--- 含 'Icon' 的类型 ---")
for n, f in icon_types:
    print("  {0}  {1}".format(n, f))

print("")
print("--- 含 'Resource' 的类型 ---")
for n, f in resource_types:
    print("  {0}  {1}".format(n, f))

# ─── 2. AbstractIcon.FromStream 方法签名 ───────────────────────────────
print("")
print("=" * 60)
print("[2] AbstractIcon.FromStream 签名")
print("=" * 60)

abstract_icon = None
for t in asm.GetTypes():
    if t.Name == 'AbstractIcon':
        abstract_icon = t
        break

if abstract_icon:
    print("AbstractIcon 基类: " + str(abstract_icon.BaseType))
    print("")
    print("FromStream 方法列表:")
    for m in abstract_icon.GetMethods(System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static | System.Reflection.BindingFlags.Instance):
        if m.Name == 'FromStream':
            params = m.GetParameters()
            print("  " + m.ToString())
            for p in params:
                print("    param: {0} {1}".format(p.ParameterType.Name, p.Name))

    print("")
    print("DrawToBitmap 方法列表:")
    for m in abstract_icon.GetMethods(System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance):
        if m.Name == 'DrawToBitmap' and not m.IsSpecialName:
            params = m.GetParameters()
            print("  " + m.ToString())
            for p in params:
                print("    param: {0} {1}".format(p.ParameterType.Name, p.Name))

    # 试试直接 new 一个 IconAtlas
    print("")
    print("--- 尝试调 FromStream ---")
    # 先拿一个 .ghicon 流
    all_names = []
    for n in asm.GetManifestResourceNames():
        if n.endswith('.ghicon'):
            all_names.append(n)
            break
    res_name = all_names[0]
    print("资源: " + res_name)
    stream = asm.GetManifestResourceStream(res_name)
    print("stream: " + str(stream))

    # 枚举所有 FromStream 重载
    for m in abstract_icon.GetMethods(System.Reflection.BindingFlags.Static | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic):
        if m.Name == 'FromStream':
            params = m.GetParameters()
            print("重载参数: {0} param(s): {1}".format(len(params), [p.ParameterType.Name for p in params]))
            try:
                args = [None] * len(params)
                # 第一个参数给 stream
                args[0] = stream
                result = m.Invoke(None, args)
                print("  结果类型: " + str(type(result)))
                print("  结果值: " + str(result))
            except Exception as e:
                print("  异常: " + str(e)[:120])

# ─── 3. IconAtlas 探查 ───────────────────────────────────────────────
print("")
print("=" * 60)
print("[3] IconAtlas 探查")
print("=" * 60)

icon_atlas = None
for t in asm.GetTypes():
    if t.Name == 'IconAtlas':
        icon_atlas = t
        break

if icon_atlas:
    print("IconAtlas 基类: " + str(icon_atlas.BaseType))
    print("")
    print("构造函数:")
    for c in icon_atlas.GetConstructors():
        print("  " + c.ToString())
    print("")
    print("公共方法 (前30):")
    for m in icon_atlas.GetMethods(System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Static):
        if not m.IsSpecialName:
            print("  {0} ({1} param(s))".format(m.Name, len(m.GetParameters())))
    print("")
    print("公共属性:")
    for p in icon_atlas.GetProperties():
        print("  {0} : {1}".format(p.Name, p.PropertyType.Name))

# ─── 4. 找实际的组件基类名 ─────────────────────────────────────────────
print("")
print("=" * 60)
print("[4] 组件基类名探查")
print("=" * 60)

# 找 GH_Component / GH_Param 的实际全名
for target in ('GH_Component', 'GH_Param', 'GH_Osc', 'GH_ActiveObject'):
    found = None
    for t in asm.GetTypes():
        if t.Name == target:
            found = t
            break
    if found:
        print("  " + target + " -> " + found.FullName + " (namespace=" + found.Namespace + ")")
        try:
            obj = System.Activator.CreateInstance(found, True)
            print("    可实例化: 是")
        except Exception as e:
            print("    可实例化: 否 (" + str(e)[:80] + ")")
    else:
        print("  " + target + " -> 未找到")

print("")
print("--- 搜索 GH 命名空间 ---")
ns_set = set()
for t in asm.GetTypes():
    if t.Namespace and t.Namespace.startswith('Grasshopper') and ('Component' in t.Name or 'ActiveObject' in t.Name or 'Param' in t.Name):
        ns_set.add(t.Namespace)
        if t.IsPublic and not t.IsAbstract:
            print("  " + t.FullName + " abstract=" + str(t.IsAbstract))

print("")
print("=" * 60)
print("诊断完成")
print("=" * 60)
