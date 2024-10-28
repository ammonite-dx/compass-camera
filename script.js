const video = document.getElementById('preview');
const shutterButton = document.getElementById('shutter-button');
const compassButton = document.getElementById('compass-button');
const downloadTableBody = document.querySelector('#download-table tbody');
const logArea = document.getElementById('log');

// JSZipインスタンスを作成
let zip;
let isRecording = false;
let mediaRecorder;
let recordedChunks = [];
let orientationData = [];  // デバイスの角度情報を記録
let currentOrientation = { alpha: null, beta: null, gamma: null };  // 現在の角度を保持
let compassAllowed = false;  // コンパス許可の状態
let orientationIntervalId;

// シャッターボタンを初期状態で無効化
shutterButton.disabled = true;

// ログ表示エリアにメッセージを追加
function logMessage(message) {
    const p = document.createElement('p');
    p.textContent = message;
    logArea.appendChild(p);
    logArea.scrollTop = logArea.scrollHeight;
}

// カメラストリームを取得してプレビューエリアに表示
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: 1280,
                height: 720,
                frameRate: { ideal: 30, max: 30 }, // フレームレートを30fpsに設定
                facingMode: 'environment'
            }
        });
        video.srcObject = stream;
        video.play();
        logMessage("カメラの使用が許可されました。");

        // mimeTypeの設定
        let mimeType = 'video/mp4';

        // MediaRecorderの初期化
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
        logMessage("カメラの使用許可が拒否されました: " + error.message);
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
                    logMessage("コンパスの使用が許可されました。");
                    compassAllowed = true;
                    shutterButton.disabled = false;  // シャッターボタンを有効化
                } else {
                    logMessage("コンパスの使用許可が拒否されました。");
                }
            })
            .catch((error) => {
                logMessage("コンパス許可のリクエスト中にエラーが発生しました: " + error.message);
            });
    } else {
        logMessage("このデバイスではコンパス機能の許可が必要ありません。");
        compassAllowed = true;
        shutterButton.disabled = false;  // シャッターボタンを有効化
    }
});

// 撮影を停止し、ZIPファイルの生成とダウンロードリンクの作成
function createZipAndDownloadLink() {
    logMessage("ZIPファイルを生成しています1");

    const timestamp = new Date().toLocaleString().replace(/\//g, '-').replace(/:/g, '-');
    const zipFilename = `recording_${timestamp}.zip`;
    zip = new JSZip();

    logMessage("ZIPファイルを生成しています2");

    // 動画のBlobを作成
    const videoBlob = new Blob(recordedChunks, { type: 'video/mp4' });
    zip.file(`video_${timestamp}.mp4`, videoBlob);

    logMessage("ZIPファイルを生成しています3");

    // オリエンテーションデータをJSONとしてZIPに追加
    const orientationJson = JSON.stringify(orientationData, null, 2);
    zip.file(`orientation_${timestamp}.json`, orientationJson);

    logMessage("ZIPファイルを生成しています4");

    // ZIPファイルを生成
    zip.generateAsync({ type: "blob" }).then((content) => {
        const zipUrl = URL.createObjectURL(content);

        // ダウンロードテーブルに新しい行を追加
        const row = downloadTableBody.insertRow();

        // ダウンロードリンクと撮影日時を表示
        const cell1 = row.insertCell(0);
        cell1.colSpan = 2;
        const link = document.createElement('a');
        link.href = zipUrl;
        link.download = zipFilename;
        link.textContent = `${zipFilename}`;
        cell1.appendChild(link);

        const timestampDiv = document.createElement('div');
        timestampDiv.textContent = `撮影日時: ${timestamp}`;
        cell1.appendChild(timestampDiv);

        logMessage("ZIPファイルの準備ができました。");
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
        shutterButton.textContent = "撮影停止";
        logMessage("録画を開始します。");

        recordedChunks = [];
        orientationData = [];  // 角度データのリセット
        zip = new JSZip();

        // 動画録画開始
        mediaRecorder.start();

        // 角度データを1/30秒ごとに記録
        orientationIntervalId = setInterval(() => {
            orientationData.push({
                timestamp: Date.now(),
                alpha: currentOrientation.alpha,
                beta: currentOrientation.beta,
                gamma: currentOrientation.gamma
            });
        }, 1000 / 30);

    } else {
        // 録画を停止
        isRecording = false;
        shutterButton.textContent = "写真を撮影";
        clearInterval(orientationIntervalId);
        mediaRecorder.stop();
        logMessage("録画を停止しました。");

        // ZIPファイルを生成し、ダウンロードリンクを作成
        createZipAndDownloadLink();
    }
});

// アプリ起動時にカメラの使用を開始
startCamera();
