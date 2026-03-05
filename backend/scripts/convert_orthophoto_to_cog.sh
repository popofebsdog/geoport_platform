#!/bin/bash

# 檢查輸入參數
if [ "$#" -ne 2 ]; then
    echo "使用方法: $0 <輸入TIF檔案> <輸出COG檔案>"
    exit 1
fi

INPUT_FILE=$1
OUTPUT_FILE=$2

echo "開始轉換正射影像為 COG 格式..."
echo "輸入檔案: $INPUT_FILE"
echo "輸出檔案: $OUTPUT_FILE"

# 使用 GDAL 轉換為 COG
gdal_translate \
    -of COG \
    -co COMPRESS=JPEG \
    -co QUALITY=85 \
    -co TILED=YES \
    -co BLOCKSIZE=512 \
    -co OVERVIEW_RESAMPLING=AVERAGE \
    -co OVERVIEWS=AUTO \
    -co BIGTIFF=IF_SAFER \
    "$INPUT_FILE" \
    "$OUTPUT_FILE"

# 檢查轉換結果
if [ $? -eq 0 ]; then
    echo "轉換成功！"
    
    # 顯示檔案大小比較
    INPUT_SIZE=$(stat -f %z "$INPUT_FILE")
    OUTPUT_SIZE=$(stat -f %z "$OUTPUT_FILE")
    
    echo "原始檔案大小: $(numfmt --to=iec-i --suffix=B $INPUT_SIZE)"
    echo "COG 檔案大小: $(numfmt --to=iec-i --suffix=B $OUTPUT_SIZE)"
    
    # 計算壓縮率
    COMPRESSION_RATIO=$(echo "scale=2; (1 - $OUTPUT_SIZE/$INPUT_SIZE) * 100" | bc)
    echo "壓縮率: ${COMPRESSION_RATIO}%"
    
    # 驗證 COG 格式
    echo "驗證 COG 格式..."
    gdalinfo "$OUTPUT_FILE" | grep -i "COG"
else
    echo "轉換失敗！"
    exit 1
fi
