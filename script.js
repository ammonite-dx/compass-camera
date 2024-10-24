const video = document.getElementById('preview');
const shutterButton = document.getElementById('shutter-button');
const compassButton = document.createElement('button');
const downloadTableBody = document.querySelector('#download-table tbody');
const logArea = document.getElementById('log');

// 「コンパス許可」ボタンをシャッターボタンの左に追加
compassButton.textContent = "コンパス許可";
compassButton.id = "compass-button";
document.body.insertBefore(compassButton, shutterButton);

// JSZipインスタンスを作成
let zip;
let photoCount = 0;
let photoFiles = [];
let isCapturing = false;
let intervalId = null;
let sessionCount = 0;  // 撮影セッションのカウンター
let orientationData = [];  // デバイスの角度情報を記録
let currentOrientation = { alpha: null, beta: null, gamma: null };  // 現在の角度を保持
let compassAllowed = false;  // コンパス許可の状態

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
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video.srcObject = stream;
        video.play();
        logMessage("カメラの使用が許可されました。");
    } catch (error) {
        logMessage("カメラの使用許可が拒否されました: " + error.message);
    }
}

// 写真を撮影し、JSZipに写真データを追加
function capturePhoto() {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // 画像データを生成
    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            const fileName = `photo_${photoCount + 1}.png`;
            zip.file(fileName, blob);  // JSZipにファイルを追加
            photoFiles.push({ fileName, blob });  // ファイル情報を保存

            // 角度データを撮影タイミングに合わせて記録
            orientationData.push({
                timestamp: Date.now(),
                alpha: currentOrientation.alpha,
                beta: currentOrientation.beta,
                gamma: currentOrientation.gamma
            });

            logMessage(`写真${photoCount + 1}を撮影しました。`);
            photoCount++;
            resolve();
        });
    });
}

// コンパスデータをリアルタイムで更新
function handleOrientation(event) {
    currentOrientation.alpha = event.alpha;  // デバイスの向き（回転）
    currentOrientation.beta = event.beta;    // 上下の傾き
    currentOrientation.gamma = event.gamma;  // 左右の傾き
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
    const timestamp = new Date().toLocaleString().replace(/\//g, '-').replace(/:/g, '-');  // 日時を取得して整形
    const zipFilename = `photos_${timestamp}.zip`;  // ZIPファイル名に日時を追加

    // オリエンテーションデータをJSONとしてZIPに追加
    const orientationJson = JSON.stringify(orientationData, null, 2);
    zip.file(`orientation_${timestamp}.json`, orientationJson);

    // ZIPファイルを生成
    zip.generateAsync({ type: "blob" }).then((content) => {
        const zipUrl = URL.createObjectURL(content);

        // ダウンロードテーブルに新しい行を追加
        const row = downloadTableBody.insertRow();
        
        // 1枚目の写真のプレビューを表示
        const cell1 = row.insertCell(0);
        const imgPreview = document.createElement('img');
        const firstPhotoUrl = URL.createObjectURL(photoFiles[0].blob);  // 1枚目の写真のURLを取得
        imgPreview.src = firstPhotoUrl;
        imgPreview.width = 100;
        cell1.appendChild(imgPreview);

        // ダウンロードリンクと撮影日時を表示
        const cell2 = row.insertCell(1);
        const link = document.createElement('a');
        link.href = zipUrl;
        link.download = zipFilename;
        link.textContent = `${zipFilename} (ダウンロード)`;
        cell2.appendChild(link);

        // 撮影日時の表示
        const timestampDiv = document.createElement('div');
        timestampDiv.textContent = `撮影日時: ${timestamp}`;
        cell2.appendChild(timestampDiv);

        logMessage("ZIPファイルの準備ができました。");
    });
}

// シャッターボタンを押して撮影を開始/停止
shutterButton.addEventListener('click', () => {
    if (!isCapturing) {
        // 撮影を開始
        isCapturing = true;
        shutterButton.textContent = "撮影停止";
        logMessage("撮影を開始します。");
        photoCount = 0;
        photoFiles = [];  // 前の写真データをリセット
        orientationData = [];  // 角度データもリセット
        zip = new JSZip();  // 新しいZIPインスタンスを作成
        sessionCount++;  // セッションカウントを増加

        intervalId = setInterval(async () => {
            await capturePhoto();
        }, 1000); // 1秒ごとに撮影

    } else {
        // 撮影を停止
        isCapturing = false;
        shutterButton.textContent = "写真を撮影";
        clearInterval(intervalId);
        logMessage("撮影を停止しました。");

        // ZIPファイルを生成し、ダウンロードリンクを作成
        createZipAndDownloadLink();
    }
});

// アプリ起動時にカメラの使用を開始
startCamera();
