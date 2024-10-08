const video = document.getElementById('video');
const table = document.getElementById('recordingsTable').getElementsByTagName('tbody')[0];
let mediaRecorder;
let recordedChunks = [];
let angleData = [];
let recordingHistory = [];  // 複数の録画データを保持

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
    recordedChunks = [];  // 各録画ごとにリセット
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/mp4' });
  
    mediaRecorder.ondataavailable = function(event) {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };
  
    mediaRecorder.start();
    addLog("Recording started.");
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
  
    mediaRecorder.onstop = function() {
        // 録画停止時に録画データを保存
        saveRecordingAndAngles();  // データの保存とリンク生成
    };
  }
  
 
// コンパス角度を記録する関数
function recordAngle(event) {
    const alpha = event.alpha;  // Z軸: 方位角
    const beta = event.beta;    // X軸: 傾き
    const gamma = event.gamma;  // Y軸: ロール
  
    if (alpha !== null && beta !== null && gamma !== null) {
      const timestamp = Date.now();
      angleData.push({ timestamp, alpha, beta, gamma });
    }
}
  
  
function addRecordingRow(videoUrl, jsonUrl, timestamp) {
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
    videoLink.download = `recording_${timestamp.replace(/[: ]/g, '-')}.mp4`;
    videoCell.appendChild(videoLink);
  
    // 角度記録のダウンロードリンク
    const jsonCell = newRow.insertCell(2);
    const jsonLink = document.createElement('a');
    jsonLink.href = jsonUrl;
    jsonLink.textContent = '角度記録をダウンロード';
    jsonLink.download = `angles_${timestamp.replace(/[: ]/g, '-')}.json`;
    jsonCell.appendChild(jsonLink);
}


function saveRecordingAndAngles() {
    if (recordedChunks.length > 0) {

        // 動画データをBlobに変換（ここですぐに行う）
        const videoBlob = new Blob(recordedChunks, { type: 'video/mp4' });
        const videoUrl = URL.createObjectURL(videoBlob);

        // 角度データをBlobに変換
        if (angleData.length > 0) {
            const jsonBlob = new Blob([JSON.stringify(angleData)], { type: 'application/json' });
            const jsonUrl = URL.createObjectURL(jsonBlob);

            // 録画と角度データを記録
            recordingHistory.push({
                videoUrl: videoUrl,
                jsonUrl: jsonUrl,
                timestamp: new Date().toLocaleString()
            });
    
            // 表に新しい行を追加
            addRecordingRow(videoUrl, jsonUrl, new Date().toLocaleString());
    
            // ログ追加
            addLog("Recording and angle data added to table.");
        }
        
        // recordedChunks をクリア
        recordedChunks = [];  // 次の録画用にクリア
        angleData = [];  // 次の記録用にクリア
    } else {
        addLog("No recorded data available.");
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