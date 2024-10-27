const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({ log: true });
const video = document.getElementById('preview');
const shutterButton = document.getElementById('shutter-button');
const compassButton = document.getElementById('compass-button');
const downloadTableBody = document.querySelector('#download-table tbody');
const logArea = document.getElementById('log');

// JSZipインスタンスとその他の変数
let photoCount = 0;
let photoFiles = [];
let isCapturing = false;
let intervalId = null;
let sessionCount = 0;
let orientationData = [];
let currentOrientation = { alpha: null, beta: null, gamma: null };
let compassAllowed = false;

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
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, facingMode: 'environment' } });
        video.srcObject = stream;
        video.play();
        logMessage("カメラの使用が許可されました。");
    } catch (error) {
        logMessage("カメラの使用許可が拒否されました: " + error.message);
    }
}

// 写真を撮影し、画像ファイルをphotoFilesに追加
function capturePhoto() {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            const fileName = `photo_${photoCount + 1}.jpg`;
            photoFiles.push({ fileName, blob });
            orientationData.push({
                timestamp: Date.now(),
                alpha: currentOrientation.alpha,
                beta: currentOrientation.beta,
                gamma: currentOrientation.gamma
            });
            logMessage(`写真${photoCount + 1}を撮影しました。`);
            photoCount++;
            resolve();
        }, 'image/jpeg', 0.8);
    });
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
                    shutterButton.disabled = false;
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
        shutterButton.disabled = false;
    }
});

// 画像をMP4動画に変換してダウンロードリンクを作成
async function convertImagesToVideo() {
    if (!ffmpeg.isLoaded()) await ffmpeg.load();

    // 画像ファイルをFFmpegに追加
    for (let i = 0; i < photoFiles.length; i++) {
        const photo = photoFiles[i];
        await ffmpeg.FS('writeFile', `img${String(i).padStart(3, '0')}.jpg`, await fetchFile(photo.blob));
    }

    // FFmpegコマンドで画像を動画に変換
    await ffmpeg.run('-framerate', '30', '-i', 'img%03d.jpg', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', 'output.mp4');

    // 生成されたMP4ファイルを取得
    const data = ffmpeg.FS('readFile', 'output.mp4');
    const videoBlob = new Blob([data.buffer], { type: 'video/mp4' });
    const url = URL.createObjectURL(videoBlob);

    // ダウンロードテーブルに新しい行を追加
    const row = downloadTableBody.insertRow();
    const cell1 = row.insertCell(0);
    const cell2 = row.insertCell(1);

    // 動画プレビュー用のサムネイル画像
    const imgPreview = document.createElement('img');
    const firstPhotoUrl = URL.createObjectURL(photoFiles[0].blob);
    imgPreview.src = firstPhotoUrl;
    imgPreview.width = 100;
    cell1.appendChild(imgPreview);

    // ダウンロードリンク
    const link = document.createElement('a');
    link.href = url;
    link.download = 'output.mp4';
    link.textContent = '動画をダウンロード';
    cell2.appendChild(link);

    logMessage("動画ファイルの準備ができました。");
}

// シャッターボタンを押して撮影を開始/停止
shutterButton.addEventListener('click', () => {
    if (!isCapturing) {
        // 撮影を開始
        isCapturing = true;
        shutterButton.textContent = "撮影停止";
        logMessage("撮影を開始します。");
        photoCount = 0;
        photoFiles = [];
        orientationData = [];
        sessionCount++;

        intervalId = setInterval(async () => {
            await capturePhoto();
        }, 1000 / 30);

    } else {
        // 撮影を停止
        isCapturing = false;
        shutterButton.textContent = "写真を撮影";
        clearInterval(intervalId);
        logMessage("撮影を停止しました。");

        // 画像を動画に変換してダウンロードリンクを作成
        convertImagesToVideo();
    }
});

// アプリ起動時にカメラの使用を開始
startCamera();