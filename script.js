const video = document.getElementById('video');
let mediaRecorder;
let recordedChunks = [];
let angleData = [];

// カメラにアクセスして、映像をvideoタグに表示
function startCamera() {
    navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: { exact: "environment" },  // リアカメラを指定
            width: { ideal: 1920 },  // 1080pに対応する解像度を指定
            height: { ideal: 1080 }
        }
    }).then(stream => {
        video.srcObject = stream;
      
        // MediaRecorderを初期化
        mediaRecorder = new MediaRecorder(stream);
      
        // 録画データを収集
        mediaRecorder.ondataavailable = function(event) {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

    }).catch(error => {
        console.error('カメラアクセスに失敗しました:', error);
        addLog("Failed to access the camera: " + error);
    });
  }

startCamera();

function startRecording() {
    addLog("Recording started");
    mediaRecorder.start();
    document.getElementById('startRecording').disabled = true;
    document.getElementById('stopRecording').disabled = false;
  
    // コンパスの権限をリクエストし、角度の記録を開始
    requestPermission();
}

function stopRecording() {
    addLog("Stopping the recording...");
  
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();  // 録画停止
    } else {
      addLog("MediaRecorder is not active.");
    }
  
    window.removeEventListener('deviceorientation', recordAngle);
  
    document.getElementById('startRecording').disabled = false;
    document.getElementById('stopRecording').disabled = true;
  
    saveRecordingAndAngles();  // 表に追加
  }
  
 
// コンパス角度を記録する関数
function recordAngle(event) {
    const alpha = event.alpha;  // Z軸: 方位角
    const beta = event.beta;    // X軸: 傾き
    const gamma = event.gamma;  // Y軸: ロール
  
    // デバッグログ
    addLog(`Alpha: ${alpha}, Beta: ${beta}, Gamma: ${gamma}`);
  
    if (alpha !== null && beta !== null && gamma !== null) {
      const timestamp = Date.now();
      angleData.push({ timestamp, alpha, beta, gamma });
    }
}
  
  
function addRecordingRow(videoUrl, jsonUrl) {
    const timestamp = new Date().toLocaleString();
    const table = document.getElementById('recordingsTable').getElementsByTagName('tbody')[0];
  
    const newRow = table.insertRow();
  
    // 録画日時
    const dateCell = newRow.insertCell(0);
    dateCell.textContent = timestamp;
  
    // 動画のダウンロードリンク
    const videoCell = newRow.insertCell(1);
    const videoLink = document.createElement('a');
    videoLink.href = videoUrl;
    videoLink.textContent = '動画をダウンロード';
    videoLink.download = `recording_${timestamp}.mp4`;
    videoCell.appendChild(videoLink);
  
    // 角度記録のダウンロードリンク
    const jsonCell = newRow.insertCell(2);
    const jsonLink = document.createElement('a');
    jsonLink.href = jsonUrl;
    jsonLink.textContent = '角度記録をダウンロード';
    jsonLink.download = `angles_${timestamp}.json`;
    jsonCell.appendChild(jsonLink);
}
  
function saveRecordingAndAngles() {
    
    if (recordedChunks.length > 0 && angleData.length > 0) {
        // 動画保存
        const videoBlob = new Blob(recordedChunks, { type: 'video/mp4' });
        const videoUrl = URL.createObjectURL(videoBlob);
      
        // 角度保存
        const jsonBlob = new Blob([JSON.stringify(angleData)], { type: 'application/json' });
        const jsonUrl = URL.createObjectURL(jsonBlob);
  
        // 表に追加
        addRecordingRow(videoUrl, jsonUrl);
        addLog("Recording and angle data added to table.");
    }
}  
  

function requestPermission() {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission()
        .then(permissionState => {
            if (permissionState === 'granted') {
                addLog("Permission granted for device orientation");
                window.addEventListener('deviceorientation', recordAngle);
            } else {
                addLog('Permission to access device orientation was denied');
            }
        })
        .catch(error => {
            addLog("Error while requesting permission: " + error);
        });
    } else {
        // 権限リクエストが不要なブラウザの場合
        addLog("DeviceOrientationEvent.requestPermission is not needed.");
        window.addEventListener('deviceorientation', recordAngle);
    }
}

// ログ出力用関数
function addLog(message) {
    const logList = document.getElementById('log-list');
    const newLog = document.createElement('li');
    newLog.textContent = message;
    logList.appendChild(newLog);
}
  
document.getElementById('startRecording').addEventListener('click', startRecording);
document.getElementById('stopRecording').addEventListener('click', stopRecording);