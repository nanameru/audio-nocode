#!/usr/bin/env python3
"""
Silero VADモデルをtorch.hubからダウンロードしてONNXにエクスポート
"""
import torch
import sys
from pathlib import Path

def export_silero_vad_to_onnx(output_path: str):
    """Silero VADモデルをONNX形式にエクスポート"""
    print(f"🔄 Loading Silero VAD model from torch.hub...")
    
    # torch.hubからモデルをロード
    model, utils = torch.hub.load(
        repo_or_dir='snakers4/silero-vad',
        model='silero_vad',
        force_reload=False,
        onnx=True  # ONNXモデルを取得
    )
    
    print(f"✅ Model loaded successfully")
    
    # モデルをONNX形式でエクスポート（onnx=Trueの場合、既にONNX形式）
    # silero-vadの最新版はonnx=Trueで直接ONNXモデルを返す
    output_dir = Path(output_path).parent
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # torch.hubからONNXモデルを直接ダウンロード
    print(f"💾 Saving ONNX model to {output_path}...")
    
    # ONNXモデルはmodelオブジェクトとして返される
    # ファイルとして保存する
    import urllib.request
    import os
    
    # torch.hubのキャッシュからONNXファイルをコピー
    hub_dir = torch.hub.get_dir()
    onnx_path = os.path.join(hub_dir, 'snakers4_silero-vad_master/files/silero_vad.onnx')
    
    if os.path.exists(onnx_path):
        import shutil
        shutil.copy(onnx_path, output_path)
        print(f"✅ ONNX model exported to {output_path}")
        print(f"📊 File size: {os.path.getsize(output_path) / 1024:.2f} KB")
        return True
    else:
        # 別の場所を探す
        print(f"⚠️ ONNX file not found at {onnx_path}")
        print(f"🔍 Searching in torch.hub cache directory: {hub_dir}")
        
        # キャッシュディレクトリ内を検索
        for root, dirs, files in os.walk(hub_dir):
            for file in files:
                if file == 'silero_vad.onnx':
                    found_path = os.path.join(root, file)
                    print(f"✅ Found ONNX model at: {found_path}")
                    import shutil
                    shutil.copy(found_path, output_path)
                    print(f"✅ ONNX model exported to {output_path}")
                    print(f"📊 File size: {os.path.getsize(output_path) / 1024:.2f} KB")
                    return True
        
        print(f"❌ Could not find ONNX model in cache")
        return False

if __name__ == "__main__":
    output_path = sys.argv[1] if len(sys.argv) > 1 else "/app/models/silero_vad.onnx"
    
    try:
        success = export_silero_vad_to_onnx(output_path)
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
