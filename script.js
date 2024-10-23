const video = document.getElementById('preview');
const shutterButton = document.getElementById('shutter-button');
const downloadTableBody = document.querySelector('#download-table tbody');
const logArea = document.getElementById('log');

// JSZipインスタンス
let zip;
let photoCount = 0;
let photoFiles = [];
let isCapturing = false;
let intervalId = null;
let captureStartTime = ''; // 撮影開始時刻を保持

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

// 現在の時刻を取得する関数（フォーマット: YYYY-MM-DD HH:mm:ss）
function getFormattedDate() {
    const now = new Date();
    return now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0') + ' ' +
        String(now.getHours()).padStart(2, '0') + ':' +
        String(now.getMinutes()).padStart(2, '0') + ':' +
        String(now.getSeconds()).padStart(2, '0');
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
        zip = new JSZip();  // 新しいJSZipインスタンスを作成
        captureStartTime = getFormattedDate();  // 撮影開始時刻を取得

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
            link.download = `photos_${captureStartTime.replace(/[: ]/g, '_')}.zip`;  // 日時をファイル名に含める
            link.textContent = `写真をまとめてダウンロード (${captureStartTime})`;

            // 1枚目の写真のサムネイルを作成
            const firstPhotoUrl = URL.createObjectURL(photoFiles[0]);
            const img = document.createElement('img');
            img.src = firstPhotoUrl;
            img.width = 100;

            // ダウンロードテーブルに新しい行を追加
            const row = downloadTableBody.insertRow();
            const cell1 = row.insertCell(0);
            const cell2 = row.insertCell(1);

            cell1.appendChild(img);  // 1枚目の写真のサムネイルを表示
            cell2.appendChild(link);  // ZIPファイルのダウンロードリンクを表示

            logMessage("ZIPファイルの準備ができました。");
        });
    }
});

// アプリ起動時にカメラの使用を開始
startCamera();
