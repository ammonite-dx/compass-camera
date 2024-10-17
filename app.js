const preview = document.getElementById('preview');
const permissionBtn = document.getElementById('permission-btn');
const logArea = document.getElementById('log-area');
const downloadTable = document.getElementById('download-table').getElementsByTagName('tbody')[0];

let videoStream;
let recording = false;
let records = []; // 映像フレームと角度のペアを保存
let currentAngles = { alpha: 0, beta: 0, gamma: 0 };

// ログ出力用関数
function log(message) {
    const newLog = document.createElement('li');
    newLog.textContent = message;
    logList.appendChild(newLog);
}

// カメラ映像を取得する関数
async function startCamera() {
    try {
        videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        preview.srcObject = videoStream;
        log("カメラのアクセスを許可しました");
    } catch (error) {
        log("カメラのアクセスが拒否されました: " + error);
    }
}

// 角度を取得するためのイベントリスナー
function handleOrientation(event) {
    currentAngles.alpha = event.alpha;
    currentAngles.beta = event.beta;
    currentAngles.gamma = event.gamma;
}

// 角度の取得を許可する
function requestCompassPermission() {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(permissionState => {
                if (permissionState === 'granted') {
                    window.addEventListener('deviceorientation', handleOrientation);
                    permissionBtn.textContent = '撮影開始';
                    log("コンパスのアクセスを許可しました");
                } else {
                    log("コンパスのアクセスが拒否されました");
                }
            })
            .catch(console.error);
    } else {
        window.addEventListener('deviceorientation', handleOrientation);
        permissionBtn.textContent = '撮影開始';
        log("コンパスのアクセスを許可しました");
    }
}

// 撮影開始と停止を切り替える
permissionBtn.addEventListener('click', () => {
    if (permissionBtn.textContent === 'コンパスの使用を許可') {
        requestCompassPermission();
    } else if (permissionBtn.textContent === '撮影開始') {
        startRecording();
    } else if (permissionBtn.textContent === '撮影停止') {
        stopRecording();
    }
});

// 録画開始
function startRecording() {
    recording = true;
    records = []; // 新しい記録用の配列を初期化
    permissionBtn.textContent = '撮影停止';
    log("撮影を開始しました");

    const captureFrameAndAngle = () => {
        if (recording) {
            captureImageWithAngles();
            setTimeout(captureFrameAndAngle, 1000 / 30); // 30 FPSで取得
        }
    };
    captureFrameAndAngle();
}

// 映像のフレームと角度を同時に取得
function captureImageWithAngles() {
    const canvas = document.createElement('canvas');
    canvas.width = preview.videoWidth;
    canvas.height = preview.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(preview, 0, 0, canvas.width, canvas.height);

    // 映像フレームの取得
    const frame = canvas.toDataURL('image/webp');
    
    // 現在の角度をペアリング
    const angles = { ...currentAngles };
    
    // フレームと角度のペアを保存
    records.push({ frame, angles });
    log(`フレームと角度をキャプチャしました: alpha=${angles.alpha}, beta=${angles.beta}, gamma=${angles.gamma}`);
}

// 撮影停止
function stopRecording() {
    recording = false;
    permissionBtn.textContent = '撮影開始';
    log("撮影を停止しました");
    saveRecordings();
}

// 映像と角度の記録を保存
function saveRecordings() {
    const timestamp = new Date().toISOString();
    
    // 映像を保存
    const frames = records.map(record => {
        return atob(record.frame.split(',')[1]).split('').map(char => char.charCodeAt(0));
    });
    const videoBlob = new Blob(frames, { type: 'image/webp' });
    const videoUrl = URL.createObjectURL(videoBlob);
    const videoLink = document.createElement('a');
    videoLink.href = videoUrl;
    videoLink.download = `video_${timestamp}.webp`;
    videoLink.textContent = `映像_${timestamp}`;
    
    // 角度の記録を保存
    const angles = records.map(record => record.angles);
    const angleBlob = new Blob([JSON.stringify(angles)], { type: 'application/json' });
    const angleUrl = URL.createObjectURL(angleBlob);
    const angleLink = document.createElement('a');
    angleLink.href = angleUrl;
    angleLink.download = `angles_${timestamp}.json`;
    angleLink.textContent = `角度_${timestamp}`;
    
    // ダウンロードテーブルに追加
    const newRow = downloadTable.insertRow();
    newRow.insertCell().appendChild(videoLink);
    newRow.insertCell().appendChild(angleLink);

    log("記録を保存しました");
}

// ページを閉じる際の処理
window.addEventListener('beforeunload', () => {
    localStorage.setItem('videoRecords', JSON.stringify(records.map(record => record.frame)));
    localStorage.setItem('angleRecords', JSON.stringify(records.map(record => record.angles)));
    log("記録をローカルストレージに保存しました");
});

// カメラの起動
startCamera();
