# Cloud Run + Vertex AI アーキテクチャ全体図

## システム全体フロー

```mermaid
graph TB
    subgraph Browser["🌐 ブラウザ (localhost:3000)"]
        UI[Next.js Frontend<br/>Audio Processing Studio]
    end

    subgraph CloudRun["☁️ Cloud Run (CPU)<br/>meeting-api-576239773901.asia-northeast1.run.app"]
        API[FastAPI API Server<br/>Port 8080]
        Health[/health]
        SignURL[POST /sign-url]
        CreateJob[POST /jobs]
        GetJob[GET /jobs/:id]
        SSE[GET /events/:id]
    end

    subgraph GCS["💾 GCS Bucket<br/>audio-processing-studio"]
        Uploads[uploads/<br/>input.wav]
        Results[results/<br/>output.json]
    end

    subgraph VertexAI["🚀 Vertex AI Custom Job"]
        Worker[GPU Worker Container<br/>L4 GPU<br/>pyannote 3.1]
    end

    subgraph ArtifactRegistry["📦 Artifact Registry"]
        APIImage[asia-northeast1-docker.pkg.dev/.../api:latest]
        WorkerImage[asia-northeast1-docker.pkg.dev/.../worker:latest]
    end

    subgraph SecretManager["🔐 Secret Manager"]
        HFToken[MEETING_HF_TOKEN]
    end

    %% フロー
    UI -->|1. 署名URL要求| SignURL
    SignURL -->|2. 署名URL返却| UI
    UI -->|3. 音声ファイルPUT| Uploads
    UI -->|4. ジョブ起動要求| CreateJob
    CreateJob -->|5. Custom Job起動| Worker
    Worker -->|6. 音声DL| Uploads
    Worker -->|7. pyannote 3.1実行| Worker
    Worker -->|8. 結果JSON UP| Results
    Worker -->|9. HFトークン取得| HFToken
    UI -->|10. SSE接続| SSE
    SSE -->|11. リアルタイム進捗| UI
    UI -->|12. ステータス確認| GetJob
    GetJob -->|13. ジョブ詳細| UI
    UI -->|14. 結果DL| Results

    %% デプロイフロー
    APIImage -.->|deploy| API
    WorkerImage -.->|submit| Worker

    style Browser fill:#e1f5ff
    style CloudRun fill:#fff4e6
    style GCS fill:#f0f4c3
    style VertexAI fill:#ffe0b2
    style ArtifactRegistry fill:#f3e5f5
    style SecretManager fill:#ffebee
```

## 詳細フロー（ステップバイステップ）

```mermaid
sequenceDiagram
    participant User as 👤 ユーザー
    participant Frontend as 🖥️ Next.js Frontend
    participant CloudRun as ☁️ Cloud Run API
    participant GCS as 💾 GCS Bucket
    participant VertexAI as 🚀 Vertex AI Job
    participant Worker as 🎯 GPU Worker

    %% Phase 1: ファイルアップロード
    rect rgb(230, 240, 255)
        Note over User,GCS: Phase 1: ファイルアップロード準備
        User->>Frontend: 音声ファイル選択
        Frontend->>CloudRun: POST /sign-url<br/>{file_name, content_type}
        CloudRun->>GCS: 署名URL生成
        CloudRun-->>Frontend: {signed_url, gs_uri}
        Frontend->>GCS: PUT signed_url<br/>音声データ直接アップロード
        GCS-->>Frontend: 200 OK
    end

    %% Phase 2: ジョブ起動
    rect rgb(255, 240, 230)
        Note over Frontend,VertexAI: Phase 2: GPU処理ジョブ起動
        Frontend->>CloudRun: POST /jobs<br/>{input_gs_uri}
        CloudRun->>VertexAI: create_custom_job<br/>GPU: L4, Region: asia-northeast1
        VertexAI->>Worker: コンテナ起動<br/>+ HFトークン注入
        VertexAI-->>CloudRun: {job_id, status: SUBMITTED}
        CloudRun-->>Frontend: {job_id, input, output, status}
    end

    %% Phase 3: リアルタイム進捗監視
    rect rgb(240, 255, 240)
        Note over Frontend,Worker: Phase 3: リアルタイム進捗監視
        Frontend->>CloudRun: GET /events/:job_id<br/>(SSE接続)
        
        par 並行処理
            loop ポーリング (5秒間隔)
                CloudRun->>VertexAI: get_custom_job(job_id)
                VertexAI-->>CloudRun: {state: RUNNING, ...}
                CloudRun-->>Frontend: SSE: {state: RUNNING}
            end
        and GPU処理
            Worker->>GCS: 音声ファイルDL (gs://...input.wav)
            Worker->>Worker: pyannote 3.1 実行<br/>話者分離処理
            Worker->>GCS: 結果JSON UP (gs://...output.json)
            Worker->>VertexAI: 完了通知
        end
    end

    %% Phase 4: 結果取得
    rect rgb(255, 240, 255)
        Note over Frontend,GCS: Phase 4: 結果取得
        VertexAI-->>CloudRun: {state: SUCCEEDED}
        CloudRun-->>Frontend: SSE: {state: SUCCEEDED, status: done}
        Frontend->>GCS: GET output.json<br/>(公開URL or 署名URL)
        GCS-->>Frontend: {segments: [...]}
        Frontend->>User: 📊 結果表示
    end
```

## データフォーマット

```mermaid
graph LR
    subgraph Input["📥 入力"]
        AudioFile[audio.wav<br/>audio.mp3<br/>audio.webm]
    end

    subgraph Processing["⚙️ 処理"]
        Pyannote[pyannote 3.1<br/>speaker-diarization]
    end

    subgraph Output["📤 出力"]
        JSON["{<br/>  segments: [<br/>    {<br/>      speaker: 'SPEAKER_00',<br/>      start: 0.0,<br/>      end: 2.5,<br/>      duration: 2.5<br/>    },<br/>    ...<br/>  ]<br/>}"]
    end

    AudioFile --> Pyannote
    Pyannote --> JSON

    style Input fill:#e3f2fd
    style Processing fill:#fff3e0
    style Output fill:#f1f8e9
```

## API エンドポイント詳細

```mermaid
graph TD
    subgraph API["Cloud Run API Endpoints"]
        E1[GET /health<br/>ヘルスチェック]
        E2[POST /sign-url<br/>GCS署名URL取得]
        E3[POST /jobs<br/>Vertex AI Job起動]
        E4[GET /jobs/:id<br/>ジョブステータス取得]
        E5[GET /events/:id<br/>SSEリアルタイム進捗]
    end

    subgraph Request["リクエスト例"]
        R1["✅ {}"]
        R2["{<br/>  file_name: 'audio.wav',<br/>  content_type: 'audio/wav'<br/>}"]
        R3["{<br/>  input_gs_uri: 'gs://bucket/input.wav'<br/>}"]
        R4["✅ Path Param"]
        R5["✅ Path Param<br/>+ SSE Stream"]
    end

    subgraph Response["レスポンス例"]
        S1["{<br/>  status: 'ok',<br/>  project: 'encoded-victory...',<br/>  region: 'asia-northeast1'<br/>}"]
        S2["{<br/>  signed_url: 'https://...',<br/>  gs_uri: 'gs://...',<br/>  expires_in: 3600<br/>}"]
        S3["{<br/>  job_id: '123',<br/>  input: 'gs://...',<br/>  output: 'gs://...',<br/>  status: 'SUBMITTED'<br/>}"]
        S4["{<br/>  job_id: '123',<br/>  status: 'RUNNING',<br/>  state: 'JOB_STATE_RUNNING',<br/>  ...<br/>}"]
        S5["SSE Stream:<br/>data: {state: 'RUNNING'}<br/>data: {state: 'SUCCEEDED'}"]
    end

    E1 --> R1 --> S1
    E2 --> R2 --> S2
    E3 --> R3 --> S3
    E4 --> R4 --> S4
    E5 --> R5 --> S5

    style API fill:#e8f5e9
    style Request fill:#fff3e0
    style Response fill:#e3f2fd
```

## デプロイメントフロー

```mermaid
graph TB
    subgraph Local["💻 ローカル開発環境"]
        Code[ソースコード]
        Dockerfile[Dockerfile]
    end

    subgraph Build["🔨 ビルドプロセス"]
        CloudBuild[Cloud Build]
    end

    subgraph Registry["📦 Artifact Registry"]
        APIImg[API Image<br/>asia-northeast1-docker.pkg.dev/.../api:latest]
        WorkerImg[Worker Image<br/>asia-northeast1-docker.pkg.dev/.../worker:latest]
    end

    subgraph Deploy["🚀 デプロイ"]
        CR[Cloud Run<br/>meeting-api]
        VAI[Vertex AI<br/>Custom Job Template]
    end

    Code -->|gcloud builds submit| CloudBuild
    Dockerfile -->|gcloud builds submit| CloudBuild
    CloudBuild -->|push| APIImg
    CloudBuild -->|push| WorkerImg
    APIImg -->|gcloud run deploy| CR
    WorkerImg -->|Custom Job起動時に使用| VAI

    style Local fill:#f3e5f5
    style Build fill:#fff3e0
    style Registry fill:#e3f2fd
    style Deploy fill:#e8f5e9
```

## コスト構造

```mermaid
graph TB
    subgraph Costs["💰 コスト試算（月間）"]
        CR_Cost[Cloud Run API<br/>CPU: 1 vCPU<br/>Memory: 2GB<br/>---<br/>常時起動ではない<br/>約 $5-10/月]
        
        VAI_Cost[Vertex AI Custom Job<br/>L4 GPU<br/>---<br/>$0.7-1.0/時<br/>1ジョブ3-5分<br/>= $0.05-0.10/回]
        
        GCS_Cost[GCS Storage<br/>---<br/>100GB: $2-3/月<br/>ネットワーク: 従量制]
        
        Total[合計目安<br/>---<br/>月100回実行:<br/>$15-25/月<br/><br/>月1000回実行:<br/>$60-110/月]
    end

    CR_Cost --> Total
    VAI_Cost --> Total
    GCS_Cost --> Total

    style CR_Cost fill:#e3f2fd
    style VAI_Cost fill:#fff3e0
    style GCS_Cost fill:#f1f8e9
    style Total fill:#ffebee
```

## セキュリティフロー

```mermaid
graph TD
    subgraph IAM["🔐 IAM & 権限管理"]
        SA_API[Cloud Run Service Account<br/>run-api@...]
        SA_Worker[Vertex AI Service Account<br/>Default Compute]
    end

    subgraph Secrets["🔑 シークレット管理"]
        HFToken[Secret Manager<br/>MEETING_HF_TOKEN]
    end

    subgraph Resources["📦 リソース"]
        GCS[GCS Bucket<br/>audio-processing-studio]
        VertexAI[Vertex AI API]
        ArtifactReg[Artifact Registry]
    end

    SA_API -->|roles/storage.admin| GCS
    SA_API -->|roles/aiplatform.user| VertexAI
    SA_API -->|roles/secretmanager.secretAccessor| HFToken
    
    SA_Worker -->|roles/storage.objectUser| GCS
    SA_Worker -->|access at runtime| HFToken

    style IAM fill:#ffebee
    style Secrets fill:#f3e5f5
    style Resources fill:#e8f5e9
```

## エラーハンドリングフロー

```mermaid
graph TD
    Start[ジョブ開始] --> CheckStatus{ステータス確認}
    
    CheckStatus -->|SUBMITTED| Wait1[待機]
    CheckStatus -->|QUEUED| Wait2[待機]
    CheckStatus -->|PENDING| Wait3[待機]
    CheckStatus -->|RUNNING| Progress[進捗更新]
    CheckStatus -->|SUCCEEDED| Success[✅ 成功]
    CheckStatus -->|FAILED| Failed[❌ 失敗]
    CheckStatus -->|CANCELLED| Cancelled[⚠️ キャンセル]
    
    Wait1 --> CheckStatus
    Wait2 --> CheckStatus
    Wait3 --> CheckStatus
    Progress --> CheckStatus
    
    Failed --> ErrorLog[エラーログ確認<br/>Cloud Logging]
    ErrorLog --> Retry{リトライ可能?}
    Retry -->|Yes| Start
    Retry -->|No| NotifyUser[ユーザー通知]
    
    Success --> DownloadResult[結果ダウンロード]
    DownloadResult --> DisplayResult[結果表示]
    
    Cancelled --> NotifyUser
    NotifyUser --> End[終了]
    DisplayResult --> End

    style Success fill:#c8e6c9
    style Failed fill:#ffcdd2
    style Cancelled fill:#fff9c4
    style Start fill:#e3f2fd
    style End fill:#f5f5f5
```

## 技術スタック全体像

```mermaid
graph TB
    subgraph Frontend["🖥️ フロントエンド"]
        Next[Next.js 14<br/>React 18<br/>TypeScript]
        UI[Tailwind CSS<br/>React Flow<br/>Zustand]
    end

    subgraph Backend["⚙️ バックエンド"]
        FastAPI[FastAPI 0.111<br/>Python 3.10]
        Libs[google-cloud-storage<br/>google-cloud-aiplatform<br/>sse-starlette]
    end

    subgraph ML["🤖 機械学習"]
        Pyannote[pyannote.audio 3.1.1<br/>PyTorch 2.2.2<br/>CUDA 12.1]
        Models[HuggingFace Models<br/>speaker-diarization-3.1]
    end

    subgraph Infra["☁️ インフラ"]
        CloudRun[Cloud Run<br/>コンテナ管理]
        VertexAI[Vertex AI<br/>GPU管理]
        GCS[GCS<br/>ストレージ]
        AR[Artifact Registry<br/>イメージ管理]
    end

    Frontend --> Backend
    Backend --> ML
    Backend --> Infra
    ML --> Infra

    style Frontend fill:#e3f2fd
    style Backend fill:#fff3e0
    style ML fill:#f1f8e9
    style Infra fill:#f3e5f5
```
