#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
export_icons.py — 在 Rhino 9 内运行，批量导出 GH2 原厂 .ghicon 为 PNG

用法:
  1. 打开 Rhino 9
  2. 命令行输入 !_EditPythonScript (或 Tools → PythonScript → Edit)
  3. 打开本文件，按 F5 运行
  4. 或直接在 Rhino 命令行: !_RunPythonScript "C:\\...\\export_icons.py"

原理:
  Grasshopper2.dll 内嵌 807 个 .ghicon 资源（私有矢量格式）。
  用官方 API AbstractIcon.FromStream() + DrawToBitmap() 渲染为 PNG。
  必须在 Rhino 进程内执行（Rhino 外部反射返回空）。

输出:
  assets/icons/{24,48,96}/*.png   三档尺寸，透明底
  data/icon_map.json              图标资源名 → 组件 ID 映射（辅助后续 M2）
"""

import sys
import os
import io
import json
import traceback

# ─── 在 Rhino 内加载 Grasshopper2 程序集 ────────────────────────────────
# Rhino 9 内置 IronPython / Python 3，需要先找到 Grasshopper2.dll

def find_grasshopper2_dll():
    """在常见路径找 Grasshopper2.dll"""
    import Rhino
    candidates = [
        r"C:\Program Files\Rhino 9\Plug-ins\Grasshopper2\Grasshopper2.dll",
        r"C:\Program Files\Rhino 9\Plug-ins\Grasshopper2\Grasshopper2.dll",
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    # 尝试从 Rhino 安装路径推导
    rhino_dir = os.path.dirname(Rhino.__file__) if '__file__' in dir(Rhino) else None
    if rhino_dir:
        gh2 = os.path.join(rhino_dir, "Plug-ins", "Grasshopper2", "Grasshopper2.dll")
        if os.path.exists(gh2):
            return gh2
    return None


def load_grasshopper():
    """加载 Grasshopper2 程序集并返回模块"""
    import clr
    dll_path = find_grasshopper2_dll()
    if not dll_path:
        raise RuntimeError("找不到 Grasshopper2.dll，请确认 Rhino 9 已安装")
    print(f"[dll] {dll_path}")
    clr.AddReference(dll_path)
    import Grasshopper2
    print(f"[module] Grasshopper2 v{Grasshopper2.Version}")
    return Grasshopper2


def list_icon_resources(asm):
    """列出所有内嵌 .ghicon 资源"""
    names = []
    for name in asm.GetManifestResourceNames():
        if name.endswith('.ghicon'):
            names.append(name)
    return sorted(names)


def render_icon(asm, resource_name, size=48):
    """用 Grasshopper2 API 把 .ghicon 渲染成 System.Drawing.Bitmap"""
    try:
        # 反射找到 AbstractIcon 类型
        icon_type = None
        for t in asm.GetTypes():
            if t.Name == 'AbstractIcon':
                icon_type = t
                break
        if not icon_type:
            print(f"  [skip] 找不到 AbstractIcon 类型")
            return None

        # 打开资源流
        stream = asm.GetManifestResourceStream(resource_name)
        if not stream:
            return None

        # 调用 FromStream — 可能有多个重载，尝试参数最多的那个
        from_stream = None
        for m in icon_type.GetMethods():
            if m.Name == 'FromStream' and not m.IsSpecialName:
                from_stream = m
                break
        if not from_stream:
            print(f"  [skip] FromStream 方法不存在")
            return None

        # 尝试调用
        try:
            icon_obj = from_stream.Invoke(None, [stream])
        except TypeError:
            # 试试带更多参数的重载
            try:
                icon_obj = from_stream.Invoke(None, [stream, None])
            except Exception:
                icon_obj = None

        if not icon_obj:
            print(f"  [skip] FromStream 返回空")
            return None

        # DrawToBitmap — 找到方法
        draw_method = None
        for m in icon_type.GetMethods():
            if m.Name == 'DrawToBitmap' and not m.IsSpecialName:
                draw_method = m
                break
        if not draw_method:
            print(f"  [skip] DrawToBitmap 方法不存在")
            return None

        # 参数: size(Eto.Drawing.Size), dpi(int), color
        import System
        import Eto.Drawing
        eto_size = Eto.Drawing.Size(size, size)
        dpi = 96
        color = System.Drawing.Color.Transparent

        bitmap = draw_method.Invoke(icon_obj, [eto_size, dpi, color])
        return bitmap

    except Exception as e:
        print(f"  [err] {resource_name}: {e}")
        return None


def save_bitmap_png(bitmap, out_path):
    """把 System.Drawing.Bitmap 保存为 PNG"""
    import System.Drawing
    bitmap.Save(out_path, System.Drawing.Imaging.ImageFormat.Png)


# ─── 主逻辑 ─────────────────────────────────────────────────────────────
def enumerate_component_types(GH2):
    """反射 GH2 程序集，枚举所有组件类型及其端口"""
    asm = GH2.__Assembly__
    results = []
    skipped = 0
    for t in asm.GetTypes():
        # 组件类型通常继承 GH_Component
        name = t.Name
        full = t.FullName
        # 过滤：只取公开的、不是抽象的、不是资源/工具类
        if not t.IsPublic or t.IsAbstract:
            continue
        if 'Resource' in full or 'Utility' in full or 'Attribute' in full:
            continue
        if not any(base.Name in ('GH_Component', 'GH_Param', 'GH_Param', 'GH_Osc')
                   for base in t.GetBaseTypes()):
            continue

        try:
            obj = Activator.CreateInstance(t)
        except Exception:
            skipped += 1
            continue

        entry = {
            "type": full,
            "type_name": name,
            "guid": getattr(obj, 'ComponentGuid', '') or str(getattr(obj, 'Guid', '')),
            "nickname": getattr(obj, 'NickName', '') or '',
            "name": getattr(obj, 'Name', '') or '',
            "description": getattr(obj, 'Description', '') or '',
            "category": getattr(obj, 'Category', '') or '',
            "subcategory": getattr(obj, 'SubCategory', '') or '',
            "inputs": [],
            "outputs": [],
        }

        # 尝试获取 Params
        try:
            params = getattr(obj, 'Params', None)
            if params:
                try:
                    for p in params.Input:
                        entry['inputs'].append({
                            'name': getattr(p, 'Name', '') or '',
                            'nickname': getattr(p, 'NickName', '') or '',
                            'description': getattr(p, 'Description', '') or '',
                            'type': str(getattr(p, 'DataTypeName', '') or getattr(p, 'TypeName', '')),
                        })
                except Exception:
                    pass
                try:
                    for p in params.Output:
                        entry['outputs'].append({
                            'name': getattr(p, 'Name', '') or '',
                            'nickname': getattr(p, 'NickName', '') or '',
                            'description': getattr(p, 'Description', '') or '',
                            'type': str(getattr(p, 'DataTypeName', '') or getattr(p, 'TypeName', '')),
                        })
                except Exception:
                    pass
        except Exception:
            pass

        results.append(entry)
        try:
            obj.Dispose()
        except Exception:
            pass

    print(f"[reflect] 枚举 {len(results)} 个组件类型 (跳过 {skipped})")
    return results


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    root = os.path.dirname(script_dir)
    icons_root = os.path.join(root, "assets", "icons")
    data_root = os.path.join(root, "data")

    print("=" * 60)
    print("GH2 工具链：图标导出 + 组件端口反射 (M0 验证)")
    print(f"输出: {root}")
    print("=" * 60)

    try:
        GH2 = load_grasshopper()
    except Exception as e:
        print(f"[fatal] 加载失败: {e}")
        traceback.print_exc()
        return

    # ── Part A: 组件类型反射 ──
    print("\n" + "─" * 40)
    print("[Part A] 反射组件类型和端口...")
    print("─" * 40)
    try:
        import System
        from System import Activator
    except ImportError:
        print("[warn] IronPython 环境，改用 clr Activator")
        import clr
        from System import Activator

    comp_types = enumerate_component_types(GH2)
    types_path = os.path.join(data_root, "gh2_types.json")
    os.makedirs(data_root, exist_ok=True)
    with open(types_path, 'w', encoding='utf-8') as f:
        json.dump(comp_types, f, indent=2, ensure_ascii=False, default=str)
    print(f"[write] {types_path}")

    # ── Part B: 图标导出 (M0 验证 5 个) ──
    print("\n" + "─" * 40)
    print("[Part B] M0 图标导出验证 (5 个样本)...")
    print("─" * 40)

    asm = GH2.__Assembly__
    icon_resources = list_icon_resources(asm)
    print(f"[resources] {len(icon_resources)} 个 .ghicon")

    SAMPLE_COUNT = 5
    samples = icon_resources[:SAMPLE_COUNT]
    sizes = [24, 48, 96]
    icon_map = {}

    for res_name in samples:
        short = os.path.basename(res_name).replace('.ghicon', '')
        print(f"导出: {short}")
        icon_map[res_name] = {"short_name": short, "sizes": {}}

        for sz in sizes:
            out_dir = os.path.join(icons_root, str(sz))
            os.makedirs(out_dir, exist_ok=True)
            out_path = os.path.join(out_dir, f"{short}.png")

            bmp = render_icon(asm, res_name, size=sz)
            if bmp:
                save_bitmap_png(bmp, out_path)
                icon_map[res_name]["sizes"][sz] = out_path
                print(f"  {sz}x{sz} ✔")
            else:
                print(f"  {sz}x{sz} ✘")

    map_path = os.path.join(data_root, "icon_map.json")
    with open(map_path, 'w', encoding='utf-8') as f:
        json.dump(icon_map, f, indent=2, ensure_ascii=False)
    print(f"[write] {map_path}")

    print("\n" + "=" * 60)
    print(f"✅ 完成: {len(comp_types)} 组件类型 + {len(samples)} 样本图标")
    print("=" * 60)


if __name__ == '__main__':
    main()
