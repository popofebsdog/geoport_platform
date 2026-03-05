#!/usr/bin/env python3
"""
將 GeoTIFF 轉換為 Cloud Optimized GeoTIFF (COG)
使用 GDAL 的 gdal_translate 命令
"""

import os
import subprocess
import sys
from pathlib import Path
import argparse

def convert_to_cog(input_path, output_path=None, compression="LZW", overviews=True):
    """
    將 GeoTIFF 轉換為 COG
    
    Args:
        input_path (str): 輸入的 GeoTIFF 文件路徑
        output_path (str, optional): 輸出的 COG 文件路徑，如果為 None 則自動生成
        compression (str): 壓縮方法，默認為 LZW
        overviews (bool): 是否生成金字塔層級，默認為 True
    
    Returns:
        str: 輸出文件路徑
    """
    
    # 檢查輸入文件是否存在
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"輸入文件不存在: {input_path}")
    
    # 如果沒有指定輸出路徑，自動生成
    if output_path is None:
        input_file = Path(input_path)
        output_path = input_file.parent / f"{input_file.stem}_cog{input_file.suffix}"
    
    # 確保輸出目錄存在
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # 構建 gdal_translate 命令
    cmd = [
        "gdal_translate",
        "-of", "COG",
        "-co", f"COMPRESS={compression}",
        "-co", "TILED=YES",
        "-co", "BLOCKSIZE=512",
    ]
    
    # 添加金字塔層級選項
    if overviews:
        cmd.extend(["-co", "OVERVIEWS=YES"])
    
    # 添加輸入和輸出文件
    cmd.extend([input_path, str(output_path)])
    
    print(f"正在轉換: {input_path} -> {output_path}")
    print(f"執行命令: {' '.join(cmd)}")
    
    try:
        # 執行命令
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        print("轉換成功!")
        print(f"輸出文件: {output_path}")
        
        # 顯示文件大小信息
        input_size = os.path.getsize(input_path) / (1024 * 1024)  # MB
        output_size = os.path.getsize(output_path) / (1024 * 1024)  # MB
        compression_ratio = (1 - output_size / input_size) * 100
        
        print(f"輸入文件大小: {input_size:.2f} MB")
        print(f"輸出文件大小: {output_size:.2f} MB")
        print(f"壓縮率: {compression_ratio:.1f}%")
        
        return str(output_path)
        
    except subprocess.CalledProcessError as e:
        print(f"轉換失敗: {e}")
        print(f"錯誤輸出: {e.stderr}")
        raise
    except FileNotFoundError:
        print("錯誤: 找不到 gdal_translate 命令")
        print("請確保已安裝 GDAL 並在 PATH 中")
        raise

def batch_convert(input_dir, output_dir=None, pattern="*.tif", compression="LZW", overviews=True):
    """
    批量轉換目錄中的所有 GeoTIFF 文件
    
    Args:
        input_dir (str): 輸入目錄
        output_dir (str, optional): 輸出目錄，如果為 None 則使用輸入目錄
        pattern (str): 文件匹配模式，默認為 "*.tif"
        compression (str): 壓縮方法
        overviews (bool): 是否生成金字塔層級
    
    Returns:
        list: 轉換成功的文件列表
    """
    
    input_path = Path(input_dir)
    if not input_path.exists():
        raise FileNotFoundError(f"輸入目錄不存在: {input_dir}")
    
    if output_dir is None:
        output_path = input_path
    else:
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
    
    # 查找所有匹配的文件
    tif_files = list(input_path.glob(pattern))
    
    if not tif_files:
        print(f"在 {input_dir} 中沒有找到匹配 {pattern} 的文件")
        return []
    
    print(f"找到 {len(tif_files)} 個文件需要轉換")
    
    converted_files = []
    failed_files = []
    
    for tif_file in tif_files:
        try:
            output_file = output_path / f"{tif_file.stem}_cog{tif_file.suffix}"
            convert_to_cog(str(tif_file), str(output_file), compression, overviews)
            converted_files.append(str(output_file))
        except Exception as e:
            print(f"轉換 {tif_file} 失敗: {e}")
            failed_files.append(str(tif_file))
    
    print(f"\n轉換完成!")
    print(f"成功: {len(converted_files)} 個文件")
    print(f"失敗: {len(failed_files)} 個文件")
    
    if failed_files:
        print("失敗的文件:")
        for file in failed_files:
            print(f"  - {file}")
    
    return converted_files

def main():
    """主函數"""
    parser = argparse.ArgumentParser(description="將 GeoTIFF 轉換為 Cloud Optimized GeoTIFF (COG)")
    parser.add_argument("input", help="輸入的 GeoTIFF 文件或目錄")
    parser.add_argument("-o", "--output", help="輸出文件或目錄")
    parser.add_argument("-c", "--compression", default="LZW", 
                       choices=["LZW", "DEFLATE", "JPEG", "LZ4", "ZSTD"],
                       help="壓縮方法 (默認: LZW)")
    parser.add_argument("--no-overviews", action="store_true", 
                       help="不生成金字塔層級")
    parser.add_argument("-p", "--pattern", default="*.tif",
                       help="批量轉換時的文件匹配模式 (默認: *.tif)")
    parser.add_argument("--batch", action="store_true",
                       help="批量轉換模式")
    
    args = parser.parse_args()
    
    try:
        if args.batch or os.path.isdir(args.input):
            # 批量轉換模式
            converted_files = batch_convert(
                args.input, 
                args.output, 
                args.pattern, 
                args.compression, 
                not args.no_overviews
            )
            print(f"批量轉換完成，共轉換 {len(converted_files)} 個文件")
        else:
            # 單文件轉換模式
            output_file = convert_to_cog(
                args.input, 
                args.output, 
                args.compression, 
                not args.no_overviews
            )
            print(f"單文件轉換完成: {output_file}")
            
    except Exception as e:
        print(f"轉換過程中發生錯誤: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
