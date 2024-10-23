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

// 写真を撮影してダウンロードリンクを生成
function capturePhoto() {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // 画像データを生成
    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const img = document.createElement('img');
            img.src = url;
            img.width = 100;

            // テーブルに行を追加
            const row = downloadTableBody.insertRow();
            const cell1 = row.insertCell(0);
            const cell2 = row.insertCell(1);

            cell1.appendChild(img);

            // ファイル名を決定し、JSZipに追加
            const fileName = `photo_${photoCount + 1}.png`;
            zip.file(fileName, blob);
            photoFiles.push(blob);

            resolve();
            logMessage(`写真${photoCount + 1}を撮影しました。`);
            photoCount++;
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
            logMessage("ZIPファイルの準備ができました。");

            const row = downloadTableBody.insertRow();
            const cell = row.insertCell(0);
            cell.colSpan = 2; // テーブル全体を1つのセルで埋める
            cell.appendChild(link);
        });
    }
});

// アプリ起動時にカメラの使用を開始
startCamera();
