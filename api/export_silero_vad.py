#!/usr/bin/env python3
"""
Silero VADモデルをtorch.hubからダウンロードしてONNXにエクスポート
"""
import torch
import sys
import os
import urllib.request
import shutil
from pathlib import Path

def export_silero_vad_to_onnx(output_path: str):
    """Silero VADモデルをONNX形式にエクスポート"""
    print(f"🔄 Downloading Silero VAD ONNX model...")
    
    # 出力ディレクトリを作成
    output_dir = Path(output_path).parent
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # 方法1: torch.hubを使ってリポジトリをクローン
    try:
        print(f"📦 Method 1: Using torch.hub to download repository...")
        # force_reload=Trueでリポジトリを確実にダウンロード
        torch.hub.load(
            repo_or_dir='snakers4/silero-vad',
            model='silero_vad',
            force_reload=True,
            onnx=False  # まずリポジトリだけ取得
        )
        
        # torch.hubのキャッシュディレクトリを取得
        hub_dir = torch.hub.get_dir()
        print(f"🔍 Searching in torch.hub cache: {hub_dir}")
        
        # 複数の可能性のあるパスを試す
        possible_paths = [
            os.path.join(hub_dir, 'snakers4_silero-vad_master', 'files', 'silero_vad.onnx'),
            os.path.join(hub_dir, 'snakers4_silero-vad_main', 'files', 'silero_vad.onnx'),
            os.path.join(hub_dir, 'checkpoints', 'snakers4_silero-vad_master', 'files', 'silero_vad.onnx'),
            os.path.join(hub_dir, 'checkpoints', 'snakers4_silero-vad_main', 'files', 'silero_vad.onnx'),
        ]
        
        for onnx_path in possible_paths:
            if os.path.exists(onnx_path):
                shutil.copy(onnx_path, output_path)
                print(f"✅ Found and copied from: {onnx_path}")
                print(f"📊 File size: {os.path.getsize(output_path) / 1024:.2f} KB")
                return True
        
        # 見つからなければディレクトリ全体を検索
        print(f"🔍 Searching entire cache directory...")
        for root, dirs, files in os.walk(hub_dir):
            if 'silero_vad.onnx' in files:
                found_path = os.path.join(root, 'silero_vad.onnx')
                shutil.copy(found_path, output_path)
                print(f"✅ Found and copied from: {found_path}")
                print(f"📊 File size: {os.path.getsize(output_path) / 1024:.2f} KB")
                return True
        
        print(f"⚠️ Method 1 failed: ONNX file not found in cache")
        
    except Exception as e:
        print(f"⚠️ Method 1 failed: {e}")
    
    # 方法2: 直接GitHubからダウンロード（フォールバック）
    try:
        print(f"📦 Method 2: Direct download from GitHub raw content...")
        
        # GitHub上のONNXファイルのURL（複数試す）
        urls = [
            'https://github.com/snakers4/silero-vad/raw/master/files/silero_vad.onnx',
            'https://github.com/snakers4/silero-vad/raw/main/files/silero_vad.onnx',
            'https://raw.githubusercontent.com/snakers4/silero-vad/master/files/silero_vad.onnx',
            'https://raw.githubusercontent.com/snakers4/silero-vad/main/files/silero_vad.onnx',
        ]
        
        for url in urls:
            try:
                print(f"🔗 Trying: {url}")
                urllib.request.urlretrieve(url, output_path)
                
                # ファイルサイズをチェック（小さすぎる場合は404ページの可能性）
                file_size = os.path.getsize(output_path)
                if file_size > 1000:  # 1KB以上
                    print(f"✅ Downloaded successfully from: {url}")
                    print(f"📊 File size: {file_size / 1024:.2f} KB")
                    return True
                else:
                    print(f"⚠️ Downloaded file too small ({file_size} bytes), trying next URL...")
                    os.unlink(output_path)
                    
            except Exception as e:
                print(f"⚠️ Failed to download from {url}: {e}")
                continue
        
        print(f"❌ Method 2 failed: All URLs returned errors")
        
    except Exception as e:
        print(f"❌ Method 2 failed: {e}")
    
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
