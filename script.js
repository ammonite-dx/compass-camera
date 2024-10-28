const video = document.getElementById('preview');
const shutterButton = document.getElementById('shutter-button');
const compassButton = document.getElementById('compass-button');

// JSZipインスタンスを作成
let zip;
let isRecording = false;
let mediaRecorder;
let recordedChunks = [];
let orientationData = [];  // デバイスの角度情報を記録
let currentOrientation = { alpha: null, beta: null, gamma: null };  // 現在の角度を保持
let compassAllowed = false;  // コンパス許可の状態

// カメラストリームを取得してプレビューエリアに表示
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: 1280,
                height: 720,
                facingMode: 'environment'
            }
        });
        video.srcObject = stream;
        video.play();

        // MediaRecorderの初期化
        let mimeType = 'video/mp4';
        mediaRecorder = new MediaRecorder(stream, { mimeType });
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            createZipAndDownloadLink();
        };
    } catch (error) {
        console.error('カメラの起動に失敗しました:', error);
    }
}

// コンパスデータをリアルタイムで更新
function handleOrientation(event) {
    currentOrientation.alpha = event.alpha;
    currentOrientation.beta = event.beta;
    currentOrientation.gamma = event.gamma;
}

// コンパス許可のリクエスト
compassButton.addEventListener('click', () => {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then((response) => {
                if (response === 'granted') {
                    window.addEventListener('deviceorientation', handleOrientation);
                    compassAllowed = true;
                    
                    // コンパス許可ボタンを非表示にし、シャッターボタンを表示
                    compassButton.style.display = 'none';
                    shutterButton.style.display = 'block';
                    shutterButton.disabled = false;  // シャッターボタンを有効化
                } else {
                    console.error("コンパスの使用許可が拒否されました。");
                }
            })
            .catch((error) => {
                console.error("コンパス許可のリクエスト中にエラーが発生しました: " + error.message);
            });
    } else {
        compassAllowed = true;
        shutterButton.disabled = false;  // シャッターボタンを有効化
    }
});

// requestVideoFrameCallbackを使ってフレームごとにオリエンテーションデータを追加
function recordOrientationPerFrame() {
    if (!isRecording) return;

    video.requestVideoFrameCallback(() => {
        orientationData.push({
            timestamp: Date.now(),
            alpha: currentOrientation.alpha,
            beta: currentOrientation.beta,
            gamma: currentOrientation.gamma
        });
        recordOrientationPerFrame();  // 次のフレームのコールバックを再帰的に呼び出す
    });
}

// 撮影を停止し、ZIPファイルの生成とダウンロードリンクの作成
function createZipAndDownloadLink() {
    const timestamp = new Date().toLocaleString().replace(/\//g, '-').replace(/:/g, '-');
    const zipFilename = `recording_${timestamp}.zip`;
    zip = new JSZip();

    // 動画のBlobを作成
    const videoBlob = new Blob(recordedChunks, { type: 'video/mp4' });
    zip.file(`video_${timestamp}.mp4`, videoBlob);

    // オリエンテーションデータをJSONとしてZIPに追加
    const orientationJson = JSON.stringify(orientationData, null, 2);
    zip.file(`orientation_${timestamp}.json`, orientationJson);

    // ZIPファイルを生成
    zip.generateAsync({ type: "blob" }).then((content) => {
        const zipUrl = URL.createObjectURL(content);

        // 自動ダウンロード用リンクを生成しクリック
        const link = document.createElement('a');
        link.href = zipUrl;
        link.download = zipFilename;
        document.body.appendChild(link);  // リンクを一時的にDOMに追加
        link.click();  // 自動クリックでダウンロード開始
        document.body.removeChild(link);  // リンクを削除
    });

    // 各種データのリセット
    recordedChunks = [];
    orientationData = [];
}

// シャッターボタンを押して録画を開始/停止
shutterButton.addEventListener('click', () => {
    if (!isRecording) {
        // 録画を開始
        isRecording = true;
        shutterButton.classList.add('recording');
        shutterButton.textContent = "撮影停止";

        recordedChunks = [];
        orientationData = [];  // 角度データのリセット
        zip = new JSZip();

        // 動画録画開始
        mediaRecorder.start();

        // フレームごとにオリエンテーションデータを取得
        recordOrientationPerFrame();

    } else {
        // 録画を停止
        isRecording = false;
        shutterButton.classList.remove('recording');
        shutterButton.textContent = "撮影開始";
        mediaRecorder.stop();
    }
});

// アプリ起動時にカメラの使用を開始
startCamera();
