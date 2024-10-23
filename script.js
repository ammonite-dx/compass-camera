const video = document.getElementById('preview');
const shutterButton = document.getElementById('shutter-button');
const downloadTableBody = document.querySelector('#download-table tbody');
const logArea = document.getElementById('log');

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

        const link = document.createElement('a');
        link.href = url;
        link.download = 'photo.png';
        link.textContent = 'ダウンロード';
        cell2.appendChild(link);

        logMessage("写真を撮影しました。");
    });
}

// 1秒おきに5枚写真を撮影
shutterButton.addEventListener('click', () => {
    let count = 0;
    const intervalId = setInterval(() => {
        if (count < 5) {
            capturePhoto();
            count++;
        } else {
            clearInterval(intervalId);
            logMessage("5枚の写真を撮影しました。");
        }
    }, 1000); // 1秒ごとに撮影
});

// アプリ起動時にカメラの使用を開始
startCamera();
