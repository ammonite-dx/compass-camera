const video = document.getElementById('preview');
const shutterButton = document.getElementById('shutter-button');
const downloadTableBody = document.querySelector('#download-table tbody');
const logArea = document.getElementById('log');

// JSZipインスタンスを作成
const zip = new JSZip();
let photoCount = 0;
let photoFiles = [];
let isCapturing = false;
let intervalId = null;

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
            photoFiles.push(blob);  // 後で使用するために保存
            logMessage(`写真${photoCount + 1}を撮影しました。`);
            photoCount++;
            resolve();
        });
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
        zip.generateAsync({ type: "blob" }).then((content) => {
            const zipUrl = URL.createObjectURL(content);
            const link = document.createElement('a');
            link.href = zipUrl;
            link.download = 'photos.zip';
            link.textContent = '写真をまとめてダウンロード';

            // ダウンロードテーブルを更新（ZIPファイルのダウンロードリンクを表示）
            downloadTableBody.innerHTML = '';  // テーブルをクリア
            const row = downloadTableBody.insertRow();
            const cell = row.insertCell(0);
            cell.colSpan = 2; // テーブル全体を1つのセルで埋める
            cell.appendChild(link);
            logMessage("ZIPファイルの準備ができました。");
        });
    }
});

// アプリ起動時にカメラの使用を開始
startCamera();
